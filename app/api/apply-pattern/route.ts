import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        // Log the incoming request content type for debugging
        const contentType = req.headers.get('content-type');
        console.log('Incoming request content-type:', contentType);

        // Check if content-type is multipart/form-data
        if (!contentType || !contentType.includes('multipart/form-data')) {
            console.log('Invalid content type received:', contentType);
            return NextResponse.json(
                {
                    error: 'Request must be multipart/form-data',
                    receivedContentType: contentType || 'none'
                },
                { status: 400 }
            );
        }

        // Parse the multipart form data
        const formData = await req.formData();

        // Log what fields we received
        const fields = Array.from(formData.keys());
        console.log('FormData fields received:', fields);

        const templateInput = formData.get('template');
        const templateImageFile = templateInput instanceof File ? templateInput : null;
        const templateImageUrl = typeof templateInput === 'string' ? templateInput : null;

        const patternInput = formData.get('pattern');
        const patternImageFile = patternInput instanceof File ? patternInput : null;
        const patternImageUrl = typeof patternInput === 'string' ? patternInput : null;
        const userPrompt = formData.get('prompt') as string || '';
        const aspectRatio = formData.get('aspectRatio') as string || '1:1';
        const size = formData.get('size') as string || '2k';

        // Extract advanced settings
        const temperatureStr = formData.get('temperature') as string;
        const seedStr = formData.get('seed') as string;

        const temperature = temperatureStr ? parseFloat(temperatureStr) : undefined;
        const seed = seedStr ? parseInt(seedStr, 10) : undefined;

        console.log('Generation Settings:', { aspectRatio, size, temperature, seed });

        // Validate inputs
        if ((!templateImageFile && !templateImageUrl) || (!patternImageFile && !patternImageUrl)) {
            return NextResponse.json(
                {
                    error: 'Template (file or URL) and pattern (file or URL) are required',
                    receivedFields: fields,
                    templateReceived: !!templateInput,
                    patternReceived: !!patternInput
                },
                { status: 400 }
            );
        }

        // Processing Template Image
        let templateBase64: string;
        let templateMimeType: string;

        if (templateImageFile) {
            console.log(`Processing template from File: ${templateImageFile.name} (${templateImageFile.size} bytes)`);
            const templateBytes = await templateImageFile.arrayBuffer();
            templateBase64 = Buffer.from(templateBytes).toString('base64');
            templateMimeType = templateImageFile.type;
        } else if (templateImageUrl) {
            console.log(`Processing template from URL: ${templateImageUrl}`);
            // Fetch the image from the URL
            const urlResponse = await fetch(templateImageUrl);
            if (!urlResponse.ok) {
                throw new Error(`Failed to fetch template image from URL: ${urlResponse.statusText}`);
            }
            const templateBlob = await urlResponse.blob();
            const templateBytes = await templateBlob.arrayBuffer();
            templateBase64 = Buffer.from(templateBytes).toString('base64');
            templateMimeType = templateBlob.type || 'image/png'; // Fallback if type missing
        } else {
            throw new Error('No template provided');
        }

        // Processing Pattern Image
        let patternBase64: string;
        let patternMimeType: string;

        if (patternImageFile) {
            const patternBytes = await patternImageFile.arrayBuffer();
            patternBase64 = Buffer.from(patternBytes).toString('base64');
            patternMimeType = patternImageFile.type;
        } else if (patternImageUrl) {
            console.log(`Processing pattern from URL: ${patternImageUrl}`);
            const urlResponse = await fetch(patternImageUrl);
            if (!urlResponse.ok) {
                throw new Error(`Failed to fetch pattern image from URL: ${urlResponse.statusText}`);
            }
            const patternBlob = await urlResponse.blob();
            const patternBytes = await patternBlob.arrayBuffer();
            patternBase64 = Buffer.from(patternBytes).toString('base64');
            patternMimeType = patternBlob.type || 'image/png';
        } else {
            throw new Error('No pattern provided');
        }

        console.log('Processing images:', {
            template: {
                source: templateImageFile ? 'file' : 'url',
                type: templateMimeType
            },
            pattern: {
                source: patternImageFile ? 'file' : 'url',
                type: patternMimeType
            }
        });

        // Initialize the Gemini model with system instructions
        const model = genAI.getGenerativeModel({
            model: 'gemini-3-pro-image-preview',
            systemInstruction: `You are an expert fashion design AI specializing in realistic pattern application.
                          When given a template item and a pattern:
                          1. Apply the pattern to the template item realistically
                          2. Preserve the item's shape, folds, shadows, and texture
                          3. Make the pattern follow natural contours
                          4. Match lighting and color tone
                          5. Maintain professional product photo quality
                          6. Do not add any text, watermarks, or branding`
        });

        const imageConfig: any = {
            aspectRatio: aspectRatio === '1:1' ? '1:1' : aspectRatio,
            imageSize: size.toUpperCase(),
        };

        // Apply advanced settings if provided
        if (temperature !== undefined) {
            // For image generation models, 'temperature' might not always be directly supported in 'imageConfig'
            // It usually sits at the top level generationConfig or is model specific.
            // However, based on our research, we will try to pass it if allowed or ignore if SDK blocks it.
            // For this implementation, we focus on seed for determinism.
        }

        const generationConfig: any = {
            // @ts-ignore
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: imageConfig,
        };

        // Add temperature if valid
        if (temperature !== undefined) {
            generationConfig.temperature = temperature;
        }

        // Add seed (integer) - This is the primary key for determinism
        // NOTE: The SDK might require this top-level or specifically typed.
        if (seed !== undefined) {
            generationConfig.seed = seed;
            // Ensure strictness if consistent seed is used
            generationConfig.topP = 0.1;
            generationConfig.topK = 1;
        }

        // Structure the request with both images and instructions
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: 'TEMPLATE IMAGE:' },
                    {
                        inlineData: {
                            mimeType: templateMimeType,
                            data: templateBase64
                        }
                    },
                    { text: 'PATTERN TO APPLY:' },
                    {
                        inlineData: {
                            mimeType: patternMimeType,
                            data: patternBase64
                        }
                    },
                    {
                        text: `TASK: Apply the pattern shown in the second image to the template item in the first image.

                   Requirements:
                   - The pattern must wrap around the item naturally following folds and curves
                   - Preserve all shadows, highlights, and texture from the original template
                   - Make it look like the pattern is applied to the material
                   - Maintain the same lighting conditions as the original photo
                   - Keep the background unchanged
                   - Output Aspect Ratio: ${aspectRatio}
                   - Target Resolution: ${size.toUpperCase()} (Ensure high quality details)

                   ${userPrompt ? `Additional instructions: ${userPrompt}` : ''}`
                    }
                ]
            }],
            generationConfig: generationConfig
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

        const sessionId = formData.get('sessionId') as string || 'unsorted';

        // Upload to Vercel Blob for permanent storage
        const imageBuffer = Buffer.from(resultImage.data, 'base64');
        const fileExtension = resultImage.mimeType?.includes('png') ? 'png' : 'jpg';

        // Get and sanitize pattern name or filename prefix
        const patternName = formData.get('patternName') as string || 'pattern';
        const filenamePrefix = formData.get('filenamePrefix') as string;

        // Use prefix if available, otherwise use pattern name
        const baseName = filenamePrefix && filenamePrefix.trim() ? filenamePrefix : patternName;

        const sanitizedName = baseName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes

        // Organized path: active-sessions/{sessionId}/generated/{sanitizedName}-{timestamp}.{ext}
        const fileName = `active-sessions/${sessionId}/generated/${sanitizedName}-${Date.now()}.${fileExtension}`;

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
