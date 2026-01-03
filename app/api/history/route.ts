import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { GenerationSession, GeneratedImage } from '@/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface HistoryEntry extends GenerationSession {
    images: GeneratedImage[];
}

// Initialize Redis client safely with support for both Upstash and Vercel KV
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redisClient = (redisUrl && redisToken)
    ? new Redis({
        url: redisUrl,
        token: redisToken,
    })
    : null;

const HISTORY_KEY = 'charlee-girl-history';

export async function GET() {
    try {
        if (!redisClient) {
            console.warn('[GET /api/history] Redis not configured, returning empty list');
            return NextResponse.json([]);
        }

        // Fetch history
        const history = await redisClient.get<HistoryEntry[]>(HISTORY_KEY);
        const sortedHistory = (history || []).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return NextResponse.json(sortedHistory);
    } catch (error) {
        console.error('Failed to fetch history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const entry: HistoryEntry = await request.json();

        // Validation basic
        if (!entry.id || !entry.images) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        if (!redisClient) {
            console.warn('[POST /api/history] Redis not configured, cannot save');
            return NextResponse.json({ error: 'Storage not available' }, { status: 503 });
        }

        const currentHistory = (await redisClient.get<HistoryEntry[]>(HISTORY_KEY)) || [];
        const updatedHistory = [...currentHistory, {
            ...entry,
            createdAt: new Date(), // Ensure server timestamp
        }];

        await redisClient.set(HISTORY_KEY, updatedHistory);

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Failed to save history:', error);
        return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        if (!redisClient) {
            console.warn('[DELETE /api/history] Redis not configured');
            return NextResponse.json({ error: 'Storage not available' }, { status: 503 });
        }

        const currentHistory = (await redisClient.get<HistoryEntry[]>(HISTORY_KEY)) || [];
        const updatedHistory = currentHistory.filter(item => item.id !== id);

        await redisClient.set(HISTORY_KEY, updatedHistory);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete history:', error);
        return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
    }
}
