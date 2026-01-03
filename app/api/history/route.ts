import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { GenerationSession, GeneratedImage } from '@/types';
import { list, del } from '@vercel/blob';

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
        const type = searchParams.get('type') || 'session'; // 'session' | 'image'
        const imageId = searchParams.get('imageId');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        if (!redisClient) {
            console.warn('[DELETE /api/history] Redis not configured');
            return NextResponse.json({ error: 'Storage not available' }, { status: 503 });
        }

        const currentHistory = (await redisClient.get<HistoryEntry[]>(HISTORY_KEY)) || [];

        if (type === 'session') {
            const sessionToDelete = currentHistory.find(item => item.id === id);

            // 1. Remove from Redis
            const updatedHistory = currentHistory.filter(item => item.id !== id);
            await redisClient.set(HISTORY_KEY, updatedHistory);

            // 2. Cleanup Blob Storage
            // Strategy: List everything under active-sessions/{id}/ AND check known URLs for legacy support
            const urlsToDelete: string[] = [];

            // Add known URLs from the session object (covers legacy files not in the folder)
            if (sessionToDelete && sessionToDelete.images) {
                sessionToDelete.images.forEach(img => {
                    if (img.generatedImageUrl) {
                        urlsToDelete.push(img.generatedImageUrl);
                    }
                });
            }

            // Find any other files in the session folder (covers files not in Redis for some reason)
            try {
                const { blobs } = await list({ prefix: `active-sessions/${id}/` });
                blobs.forEach(blob => {
                    if (!urlsToDelete.includes(blob.url)) {
                        urlsToDelete.push(blob.url);
                    }
                });
            } catch (err) {
                console.warn('Failed to list blobs for cleanup:', err);
            }

            // Perform bulk deletion
            if (urlsToDelete.length > 0) {
                console.log(`[DELETE] Removing ${urlsToDelete.length} blobs for session ${id}`);
                // del accepts string or array of strings. 
                // We do this asynchronously without awaiting to not block the UI response too long, 
                // or await it if we want to ensure cleanup. Awaiting is safer.
                await del(urlsToDelete);
            }

            return NextResponse.json({ success: true, deletedCount: urlsToDelete.length });

        } else if (type === 'image') {
            if (!imageId) {
                return NextResponse.json({ error: 'Image ID required for image deletion' }, { status: 400 });
            }

            const sessionIndex = currentHistory.findIndex(item => item.id === id);
            if (sessionIndex === -1) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            const session = currentHistory[sessionIndex];
            const imageIndex = session.images.findIndex(img => img.id === imageId);

            if (imageIndex === -1) {
                return NextResponse.json({ error: 'Image not found' }, { status: 404 });
            }

            const imageToDelete = session.images[imageIndex];
            const imageUrlByType = imageToDelete.generatedImageUrl;

            // Remove image from session
            session.images.splice(imageIndex, 1);

            // Update Redis
            // If session has no images left, should we delete the session? 
            // User probably prefers keeping the empty session container or deleting it manually. 
            // Let's keep it for now.
            currentHistory[sessionIndex] = session;
            await redisClient.set(HISTORY_KEY, currentHistory);

            // Delete from Blob Storage
            if (imageUrlByType) {
                await del(imageUrlByType);
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error('Failed to delete history:', error);
        return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
    }
}
