
import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const urlToDelete = searchParams.get('url');

        if (!urlToDelete) {
            return NextResponse.json(
                { error: 'URL parameter is required' },
                { status: 400 }
            );
        }

        // Only allow deleting URLs from our blob store
        if (!urlToDelete.includes('public.blob.vercel-storage.com')) {
            console.warn('Attempted to delete non-Vercel URL:', urlToDelete);
            // We pretend success to not block the UI if it's an external URL
            return NextResponse.json({ success: true });
        }

        console.log('[DELETE /api/templates/blob] Deleting blob:', urlToDelete);
        await del(urlToDelete);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting blob:', error);
        return NextResponse.json(
            { error: 'Failed to delete blob' },
            { status: 500 }
        );
    }
}
