import { put, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

// POST - Upload an image to Vercel Blob
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'File must be an image' },
                { status: 400 }
            );
        }

        // Upload to Vercel Blob
        const blob = await put(`templates/${Date.now()}-${file.name}`, file, {
            access: 'public',
        });

        return NextResponse.json({
            url: blob.url,
            pathname: blob.pathname,
        });
    } catch (error) {
        console.error('Error uploading image:', error);

        // If Blob is not configured, return an error with clear message
        if (error instanceof Error && error.message.includes('BLOB')) {
            return NextResponse.json(
                { error: 'Vercel Blob storage not configured. Please set up Blob storage in your Vercel dashboard.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}

// DELETE - Delete an image from Vercel Blob
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json(
                { error: 'Image URL is required' },
                { status: 400 }
            );
        }

        await del(url);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json(
            { error: 'Failed to delete image' },
            { status: 500 }
        );
    }
}
