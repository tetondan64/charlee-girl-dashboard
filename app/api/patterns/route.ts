import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const PATTERNS_KEY = 'charlee-girl-patterns';

export interface PersistentPattern {
    id: string;
    name: string;
    url: string;
    createdAt: string; // ISO string for JSON serialization
}

// GET - Fetch all patterns
export async function GET() {
    try {
        const patterns = await redis.get<PersistentPattern[]>(PATTERNS_KEY);
        return NextResponse.json(patterns || []);
    } catch (error) {
        console.error('Failed to fetch patterns:', error);
        return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 });
    }
}

// POST - Add a new pattern
export async function POST(request: Request) {
    try {
        const newPattern: PersistentPattern = await request.json();

        // Simple append - concurrency isn't as critical here as templates, 
        // but we'll specific implementation to be safe-ish
        const currentPatterns = (await redis.get<PersistentPattern[]>(PATTERNS_KEY)) || [];
        const updatedPatterns = [...currentPatterns, newPattern];

        await redis.set(PATTERNS_KEY, updatedPatterns);

        return NextResponse.json(newPattern, { status: 201 });
    } catch (error) {
        console.error('Failed to save pattern:', error);
        return NextResponse.json({ error: 'Failed to save pattern' }, { status: 500 });
    }
}

// DELETE - Remove a pattern
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Pattern ID require' }, { status: 400 });
        }

        const currentPatterns = (await redis.get<PersistentPattern[]>(PATTERNS_KEY)) || [];
        const updatedPatterns = currentPatterns.filter(p => p.id !== id);

        await redis.set(PATTERNS_KEY, updatedPatterns);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete pattern:', error);
        return NextResponse.json({ error: 'Failed to delete pattern' }, { status: 500 });
    }
}
