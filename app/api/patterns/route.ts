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
            const updatedPatterns = [...currentPatterns, newPattern];
            await redisClient.set(PATTERNS_KEY, updatedPatterns);
        } else {
            console.warn('[POST /api/patterns] Redis not configured, saving to memory');
            memoryPatterns.push(newPattern);
        }

        return NextResponse.json(newPattern, { status: 201 });
    } catch (error) {
        console.error('Failed to save pattern:', error);
        return NextResponse.json({ error: 'Failed to save pattern' }, { status: 500 });
    }
}

// PATCH - Rename a pattern
export async function PATCH(request: Request) {
    try {
        const { id, name } = await request.json();

        if (!id || !name) {
            return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
        }

        if (redisClient) {
            const currentPatterns = (await redisClient.get<PersistentPattern[]>(PATTERNS_KEY)) || [];
            let found = false;
            const updatedPatterns = currentPatterns.map(p => {
                if (p.id === id) {
                    found = true;
                    return { ...p, name: name };
                }
                return p;
            });

            if (!found) {
                return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
            }

            await redisClient.set(PATTERNS_KEY, updatedPatterns);
        } else {
            const pattern = memoryPatterns.find(p => p.id === id);
            if (!pattern) {
                return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
            }
            pattern.name = name;
        }

        return NextResponse.json({ success: true, name });
    } catch (error) {
        console.error('Failed to rename pattern:', error);
        return NextResponse.json({ error: 'Failed to rename pattern' }, { status: 500 });
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
