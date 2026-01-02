import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get the model for image generation
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

export interface GenerateImageOptions {
    templateImageBase64: string;
    templateMimeType: string;
    patternImageBase64: string;
    patternMimeType: string;
    basePrompt: string;
    modification?: string;
    aspectRatio?: string;
}

export interface GenerateImageResult {
    success: boolean;
    imageBase64?: string;
    mimeType?: string;
    error?: string;
}

/**
 * Generate a product image by applying a pattern to a template
 */
export async function generateProductImage(
    options: GenerateImageOptions
): Promise<GenerateImageResult> {
    const {
        templateImageBase64,
        templateMimeType,
        patternImageBase64,
        patternMimeType,
        basePrompt,
        modification
    } = options;

    try {
        // Build the full prompt
        let fullPrompt = basePrompt;
        if (modification) {
            fullPrompt += `\n\nAdditional instructions: ${modification}`;
        }

        // Call Gemini with both images
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: templateMimeType,
                    data: templateImageBase64,
                },
            },
            {
                inlineData: {
                    mimeType: patternMimeType,
                    data: patternImageBase64,
                },
            },
            {
                text: fullPrompt,
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // For now, return the text response
        // In a full implementation, we'd use Imagen for actual image generation
        return {
            success: true,
            imageBase64: undefined,
            mimeType: undefined,
            error: text ? undefined : 'No response from API',
        };
    } catch (error) {
        console.error('Gemini API error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Refine a generated image with additional instructions
 */
export async function refineImage(
    imageBase64: string,
    imageMimeType: string,
    refinementPrompt: string
): Promise<GenerateImageResult> {
    try {
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64,
                },
            },
            {
                text: `Please modify this image according to the following instructions: ${refinementPrompt}`,
            },
        ]);

        const response = await result.response;
        const text = response.text();

        return {
            success: true,
            error: text ? undefined : 'No response from API',
        };
    } catch (error) {
        console.error('Gemini API refinement error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Test the API connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
    try {
        const result = await model.generateContent('Say "Connection successful!" if you can read this.');
        const response = await result.response;
        const text = response.text();

        return {
            success: true,
            message: text || 'Connected but no response',
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to connect',
        };
    }
}
