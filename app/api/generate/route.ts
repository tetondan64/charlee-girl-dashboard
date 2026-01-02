import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, templateImage, patternImage, prompt, modification } = body;

        if (action === 'test') {
            // Test the API connection
            const result = await testConnection();
            return NextResponse.json(result);
        }

        if (action === 'generate') {
            // For now, return a mock response
            // Full implementation would call generateProductImage
            if (!templateImage || !patternImage || !prompt) {
                return NextResponse.json(
                    { success: false, error: 'Missing required fields' },
                    { status: 400 }
                );
            }

            // Simulate generation delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Return mock success (would be actual generated image in production)
            return NextResponse.json({
                success: true,
                message: 'Image generation initiated',
                generatedImageUrl: templateImage, // Placeholder
                prompt: prompt + (modification ? `\n\n${modification}` : ''),
                apiCost: 0.05,
            });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Generate API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Test endpoint to verify API key is configured
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (!hasApiKey) {
        return NextResponse.json({
            success: false,
            message: 'Gemini API key not configured',
        });
    }

    const result = await testConnection();
    return NextResponse.json(result);
}
