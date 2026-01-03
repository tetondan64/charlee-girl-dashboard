import { NextResponse } from 'next/server';
import { GenerationSession, GeneratedImage } from '@/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface HistoryEntry extends GenerationSession {
    images: GeneratedImage[];
}

// In-memory store for history (resets on server restart)
// In a real app with Redis configured, this would use Redis.
let historyStore: HistoryEntry[] = [];

export async function GET() {
    try {
        // Sort by newest first
        const sortedHistory = [...historyStore].sort((a, b) =>
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

        historyStore.push({
            ...entry,
            createdAt: new Date(), // Ensure server timestamp
        });

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

        historyStore = historyStore.filter(item => item.id !== id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete history:', error);
        return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
    }
}
