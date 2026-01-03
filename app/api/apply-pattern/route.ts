import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        // Parse the multipart form data
        const formData = await req.formData();
        const clothingImage = formData.get('clothing') as File;
        const patternImage = formData.get('pattern') as File;
        const userPrompt = formData.get('prompt') as string || '';

        // Validate inputs
        if (!clothingImage || !patternImage) {
            return NextResponse.json(
                { error: 'Both clothing and pattern images are required' },
                { status: 400 }
            );
        }

        // Convert clothing image to base64
        const clothingBytes = await clothingImage.arrayBuffer();
        const clothingBase64 = Buffer.from(clothingBytes).toString('base64');

        // Convert pattern image to base64
        const patternBytes = await patternImage.arrayBuffer();
        const patternBase64 = Buffer.from(patternBytes).toString('base64');

        console.log('Processing images:', {
            clothing: { size: clothingBytes.byteLength, type: clothingImage.type },
            pattern: { size: patternBytes.byteLength, type: patternImage.type }
        });

        // Initialize the Gemini model with system instructions
        const model = genAI.getGenerativeModel({
            model: 'gemini-3-pro-image-preview',
            systemInstruction: `You are an expert fashion design AI specializing in realistic pattern application.
                          When given a clothing item and a pattern:
                          1. Apply the pattern to the clothing realistically
                          2. Preserve the garment's shape, folds, shadows, and texture
                          3. Make the pattern follow natural fabric contours
                          4. Match lighting and color tone
                          5. Maintain professional e-commerce photo quality
                          6. Do not add any text, watermarks, or branding`
        });

        // Structure the request with both images and instructions
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: 'CLOTHING TEMPLATE IMAGE:' },
                    {
                        inlineData: {
                            mimeType: clothingImage.type,
                            data: clothingBase64
                        }
                    },
                    { text: 'PATTERN TO APPLY:' },
                    {
                        inlineData: {
                            mimeType: patternImage.type,
                            data: patternBase64
                        }
                    },
                    {
                        text: `TASK: Apply the pattern shown in the second image to the clothing item in the first image.

                   Requirements:
                   - The pattern must wrap around the garment naturally following folds and curves
                   - Preserve all shadows, highlights, and fabric texture from the original clothing
                   - Make it look like the pattern is printed on the fabric, not overlaid
                   - Maintain the same lighting conditions as the original photo
                   - Keep the background unchanged

                   ${userPrompt ? `Additional instructions: ${userPrompt}` : ''}`
                    }
                ]
            }]
        });

        // Extract the generated image
        const response = await result.response;
        const candidates = response.candidates;

        if (!candidates || candidates.length === 0) {
            throw new Error('No candidates returned from Gemini');
        }

        const generatedPart = candidates[0].content.parts[0];

        // Check if we got an image in the response
        if (!('inlineData' in generatedPart) || !generatedPart.inlineData) {
            // The API returned text instead of an image
            const textResponse = 'text' in generatedPart ? generatedPart.text : 'Unknown response';
            console.log('Gemini returned text instead of image:', textResponse);
            return NextResponse.json({
                success: false,
                error: 'Gemini returned text instead of an image. This model may not support image generation.',
                textResponse
            }, { status: 500 });
        }

        const resultImage = generatedPart.inlineData;

        console.log('Successfully generated image:', {
            mimeType: resultImage.mimeType,
            dataLength: resultImage.data.length
        });

        // Upload to Vercel Blob for permanent storage
        const imageBuffer = Buffer.from(resultImage.data, 'base64');
        const fileExtension = resultImage.mimeType?.includes('png') ? 'png' : 'jpg';
        const fileName = `generated/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

        const blob = await put(fileName, imageBuffer, {
            access: 'public',
            contentType: resultImage.mimeType || 'image/png',
        });

        return NextResponse.json({
            success: true,
            imageUrl: blob.url,
            mimeType: resultImage.mimeType
        });

    } catch (error: unknown) {
        console.error('Pattern application failed:', error);

        const errorMessage = error instanceof Error ? error.message : 'Failed to apply pattern';
        const errorDetails = error instanceof Error ? error.toString() : String(error);

        return NextResponse.json(
            {
                error: errorMessage,
                details: errorDetails
            },
            { status: 500 }
        );
    }
}

// Configure route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds - may need Pro plan for full duration
