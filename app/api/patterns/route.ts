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

export interface PersistentPattern {
    id: string;
    name: string;
    url: string;
    productTypeId?: string; // Optional for backward compatibility/global patterns
    createdAt: string;
}

// GET - Fetch patterns, optionally filtered by productTypeId
export async function GET(request: Request) {
    try {
        if (!redisClient) {
            console.warn('[GET /api/patterns] Redis not configured, returning empty list');
            return NextResponse.json([]);
        }

        const { searchParams } = new URL(request.url);
        const productTypeId = searchParams.get('productTypeId');

        const patterns = await redisClient.get<PersistentPattern[]>(PATTERNS_KEY);
        let result = patterns || [];

        // Filter by productTypeId if provided
        // If productTypeId is provided, show patterns that match OR have no productTypeId (global)
        // Or if the user wants STRICT scoping, only show matches.
        // Let's go with strict + global (if any) for now, or just strict as requested "tied to a specific product type"
        if (productTypeId) {
            result = result.filter(p => !p.productTypeId || p.productTypeId === productTypeId);
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

        if (!redisClient) {
            console.warn('[POST /api/patterns] Redis not configured, preventing save');
            return NextResponse.json({ error: 'Storage not available in local mode' }, { status: 503 });
        }

        const currentPatterns = (await redisClient.get<PersistentPattern[]>(PATTERNS_KEY)) || [];
        const updatedPatterns = [...currentPatterns, newPattern];

        await redisClient.set(PATTERNS_KEY, updatedPatterns);

        return NextResponse.json(newPattern, { status: 201 });
    } catch (error) {
        console.error('Failed to save pattern:', error);
        return NextResponse.json({ error: 'Failed to save pattern' }, { status: 500 });
    }
}

// DELETE - Remove a pattern
export async function DELETE(request: Request) {
    try {
        if (!redisClient) {
            console.warn('[DELETE /api/patterns] Redis not configured');
            return NextResponse.json({ error: 'Storage not available in local mode' }, { status: 503 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Pattern ID require' }, { status: 400 });
        }

        const currentPatterns = (await redisClient.get<PersistentPattern[]>(PATTERNS_KEY)) || [];
        // Just filter by ID, no need to check productTypeId for deletion
        const updatedPatterns = currentPatterns.filter(p => p.id !== id);

        await redisClient.set(PATTERNS_KEY, updatedPatterns);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete pattern:', error);
        return NextResponse.json({ error: 'Failed to delete pattern' }, { status: 500 });
    }
}
