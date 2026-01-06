import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { PersistentPattern } from '@/types';

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize Redis client safely with support for both Upstash and Vercel KV
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redisClient = (redisUrl && redisToken)
    ? new Redis({
        url: redisUrl,
        token: redisToken,
    })
    : null;

const PATTERNS_KEY = 'charlee-girl-patterns';



// In-memory fallback for development without Redis
let memoryPatterns: PersistentPattern[] = [];

// GET - Fetch patterns, optionally filtered by productTypeId
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productTypeId = searchParams.get('productTypeId');

        let patterns: PersistentPattern[] = [];

        if (redisClient) {
            patterns = (await redisClient.get<PersistentPattern[]>(PATTERNS_KEY)) || [];
        } else {
            console.warn('[GET /api/patterns] Redis not configured, using memory store');
            patterns = memoryPatterns;
        }

        let result = patterns;

        if (productTypeId) {
            // STRICT scoping: Only show patterns that belong to this specific set.
            result = result.filter(p => p.productTypeId === productTypeId);
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to fetch patterns:', error);
        return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 });
    }
}

// POST - Add a new pattern
export async function POST(request: Request) {
    try {
        const newPattern: PersistentPattern = await request.json();

        if (redisClient) {
            const currentPatterns = (await redisClient.get<PersistentPattern[]>(PATTERNS_KEY)) || [];

            // Check for duplicate name
            if (currentPatterns.some(p => p.name.trim().toLowerCase() === newPattern.name.trim().toLowerCase() && p.productTypeId === newPattern.productTypeId)) {
                return NextResponse.json({ error: 'A pattern with this name already exists in this set.' }, { status: 409 });
            }

            const updatedPatterns = [...currentPatterns, newPattern];
            await redisClient.set(PATTERNS_KEY, updatedPatterns);
        } else {
            console.warn('[POST /api/patterns] Redis not configured, saving to memory');

            // Check for duplicate name (Memory)
            if (memoryPatterns.some(p => p.name.trim().toLowerCase() === newPattern.name.trim().toLowerCase() && p.productTypeId === newPattern.productTypeId)) {
                return NextResponse.json({ error: 'A pattern with this name already exists in this set.' }, { status: 409 });
            }

            memoryPatterns.push(newPattern);
        }

        return NextResponse.json(newPattern, { status: 201 });
    } catch (error) {
        console.error('Failed to save pattern:', error);
        return NextResponse.json({ error: 'Failed to save pattern' }, { status: 500 });
    }
}

// PATCH - Update a pattern (Rename or Update URL)
export async function PATCH(request: Request) {
    try {
        const { id, name, url, productTypeId } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Pattern ID is required' }, { status: 400 });
        }

        const updatePattern = (p: PersistentPattern) => {
            if (p.id === id) {
                return {
                    ...p,
                    name: name !== undefined ? name : p.name,
                    url: url !== undefined ? url : p.url,
                    productTypeId: productTypeId !== undefined ? productTypeId : p.productTypeId
                };
            }
            return p;
        };

        if (redisClient) {
            const currentPatterns = (await redisClient.get<PersistentPattern[]>(PATTERNS_KEY)) || [];
            let found = false;
            const updatedPatterns = currentPatterns.map(p => {
                if (p.id === id) {
                    found = true;
                    return updatePattern(p);
                }
                return p;
            });

            if (!found) {
                return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
            }

            await redisClient.set(PATTERNS_KEY, updatedPatterns);
        } else {
            const index = memoryPatterns.findIndex(p => p.id === id);
            if (index === -1) {
                return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
            }
            memoryPatterns[index] = updatePattern(memoryPatterns[index]);
        }

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Failed to update pattern:', error);
        return NextResponse.json({ error: 'Failed to update pattern' }, { status: 500 });
    }
}

// DELETE - Remove a pattern
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Pattern ID required' }, { status: 400 });
        }

        if (redisClient) {
            const currentPatterns = (await redisClient.get<PersistentPattern[]>(PATTERNS_KEY)) || [];
            const updatedPatterns = currentPatterns.filter(p => p.id !== id);
            await redisClient.set(PATTERNS_KEY, updatedPatterns);
        } else {
            memoryPatterns = memoryPatterns.filter(p => p.id !== id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete pattern:', error);
        return NextResponse.json({ error: 'Failed to delete pattern' }, { status: 500 });
    }
}
