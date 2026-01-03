# Nano Banana Pattern Applier - Complete Next.js Implementation Guide

## Overview
This guide walks you through building a Next.js app that uses Google's Nano Banana (Gemini image generation API) to apply pattern images onto clothing templates. The app accepts two images (clothing template + pattern) and a text prompt, then generates a realistic composite image.

---

## Prerequisites

- Node.js 18+ installed
- A Google Gemini API key (you already have this)
- Basic understanding of Next.js and TypeScript

---

## Step 1: Create a New Next.js Project

```bash
npx create-next-app@latest pattern-applier
```

When prompted, select:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **No**
- App Router: **Yes**
- Customize default import alias: **No**

Navigate into your project:

```bash
cd pattern-applier
```

---

## Step 2: Install Dependencies

Install the Google Generative AI SDK:

```bash
npm install @google/generative-ai
```

Install AWS SDK for cloud storage (optional, for production):

```bash
npm install @aws-sdk/client-s3
```

---

## Step 3: Set Up Environment Variables

Create a `.env.local` file in the root of your project:

```bash
touch .env.local
```

Add your Gemini API key:

```
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: For cloud storage (Cloudflare R2, DigitalOcean Spaces, or S3)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-public-domain.com
```

**Important:** Never commit `.env.local` to version control. Add it to `.gitignore` (Next.js does this automatically).

---

## Step 4: Create the API Route Handler

Create the directory structure:

```bash
mkdir -p app/api/apply-pattern
```

Create `app/api/apply-pattern/route.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

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
      model: 'gemini-3-pro-image-preview', // Use Pro for better quality
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

    if (!generatedPart.inlineData) {
      throw new Error('No image data in response');
    }

    const resultImage = generatedPart.inlineData;

    console.log('Successfully generated image:', {
      mimeType: resultImage.mimeType,
      dataLength: resultImage.data.length
    });

    // Option 1: Return base64 directly (good for prototyping)
    return NextResponse.json({
      success: true,
      image: `data:${resultImage.mimeType};base64,${resultImage.data}`,
      mimeType: resultImage.mimeType
    });

    // Option 2: Upload to cloud storage and return URL (recommended for production)
    // Uncomment and implement uploadToStorage function below
    /*
    const imageBuffer = Buffer.from(resultImage.data, 'base64');
    const imageUrl = await uploadToStorage(imageBuffer, resultImage.mimeType);

    return NextResponse.json({
      success: true,
      imageUrl,
      mimeType: resultImage.mimeType
    });
    */

  } catch (error: any) {
    console.error('Pattern application failed:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Failed to apply pattern',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

// Optional: Helper function to upload to cloud storage (Cloudflare R2 / S3)
/*
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function uploadToStorage(buffer: Buffer, mimeType: string): Promise<string> {
  const fileExtension = mimeType.includes('png') ? 'png' : 'jpg';
  const key = `patterns/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
*/

// Configure route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Vercel Pro, 10s for Hobby
```

---

## Step 5: Create the Frontend Component

Replace the contents of `app/page.tsx`:

```typescript
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function Home() {
  const [clothingFile, setClothingFile] = useState<File | null>(null);
  const [patternFile, setPatternFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clothingPreview, setClothingPreview] = useState<string | null>(null);
  const [patternPreview, setPatternPreview] = useState<string | null>(null);

  const clothingInputRef = useRef<HTMLInputElement>(null);
  const patternInputRef = useRef<HTMLInputElement>(null);

  const handleClothingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }

      setClothingFile(file);
      setClothingPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handlePatternUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }

      setPatternFile(file);
      setPatternPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleReset = () => {
    setClothingFile(null);
    setPatternFile(null);
    setPrompt('');
    setResultImage(null);
    setClothingPreview(null);
    setPatternPreview(null);
    setError(null);

    if (clothingInputRef.current) clothingInputRef.current.value = '';
    if (patternInputRef.current) patternInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clothingFile || !patternFile) {
      setError('Please upload both clothing and pattern images');
      return;
    }

    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append('clothing', clothingFile);
      formData.append('pattern', patternFile);
      formData.append('prompt', prompt);

      console.log('Submitting request...');

      const response = await fetch('/api/apply-pattern', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply pattern');
      }

      console.log('Success:', data);
      setResultImage(data.image || data.imageUrl);

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `patterned-clothing-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Pattern Applier
          </h1>
          <p className="text-xl text-gray-600">
            Apply any pattern to clothing using Google Gemini Nano Banana
          </p>
        </div>

        {/* Main form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Clothing upload */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-gray-700">
                1. Upload Clothing Template
              </label>
              <p className="text-sm text-gray-500">
                Upload a clear photo of the clothing item
              </p>
              <input
                ref={clothingInputRef}
                type="file"
                accept="image/*"
                onChange={handleClothingUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 
                         file:rounded-lg file:border-0 file:text-sm file:font-semibold 
                         file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 
                         cursor-pointer border border-gray-300 rounded-lg"
              />
              {clothingPreview && (
                <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-200">
                  <Image
                    src={clothingPreview}
                    alt="Clothing preview"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>

            {/* Pattern upload */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-gray-700">
                2. Upload Pattern
              </label>
              <p className="text-sm text-gray-500">
                Upload the pattern/texture you want to apply
              </p>
              <input
                ref={patternInputRef}
                type="file"
                accept="image/*"
                onChange={handlePatternUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 
                         file:rounded-lg file:border-0 file:text-sm file:font-semibold 
                         file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 
                         cursor-pointer border border-gray-300 rounded-lg"
              />
              {patternPreview && (
                <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden border-2 border-indigo-200">
                  <Image
                    src={patternPreview}
                    alt="Pattern preview"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Additional prompt */}
          <div className="space-y-4 mb-8">
            <label className="block text-lg font-semibold text-gray-700">
              3. Additional Instructions (Optional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Make the pattern slightly faded', 'Apply only to the front', 'Use a vintage color tone'..."
              className="w-full p-4 border border-gray-300 rounded-lg h-32 focus:ring-2 
                       focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || !clothingFile || !patternFile}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 
                       text-white rounded-lg font-semibold text-lg
                       disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed
                       hover:from-blue-700 hover:to-indigo-700 transition-all duration-200
                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                '✨ Apply Pattern to Clothing'
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-lg font-semibold
                       hover:bg-gray-300 transition-all duration-200"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result display */}
        {resultImage && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">🎨 Result</h2>
            <div className="relative w-full max-w-3xl mx-auto">
              <Image
                src={resultImage}
                alt="Pattern applied to clothing"
                width={1024}
                height={1024}
                className="w-full h-auto rounded-lg shadow-lg border-4 border-gray-200"
              />
            </div>
            <div className="mt-8 flex gap-4 justify-center">
              <button
                onClick={handleDownload}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold
                         hover:bg-green-700 transition-all duration-200 shadow-md
                         hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Image
              </button>
              <button
                onClick={() => setResultImage(null)}
                className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold
                         hover:bg-gray-300 transition-all duration-200"
              >
                Generate Another
              </button>
            </div>
          </div>
        )}

        {/* Footer tips */}
        <div className="mt-12 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Tips for Best Results</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Use high-quality, well-lit photos of clothing items</li>
            <li>• Simple backgrounds work better than complex ones</li>
            <li>• Clear, repeating patterns typically apply more realistically</li>
            <li>• Try different prompts if the first result isn't perfect</li>
            <li>• Processing time: 10-30 seconds depending on image complexity</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
```

---

## Step 6: Update Global Styles (Optional)

Your Tailwind CSS is already configured. If you want to customize further, edit `app/globals.css`.

---

## Step 7: Run the Development Server

Start your Next.js development server:

```bash
npm run dev
```

Open your browser and navigate to:

```
http://localhost:3000
```

---

## Step 8: Test the Application

1. **Upload a clothing image**: Click the first upload button and select a photo of a clothing item (t-shirt, dress, jacket, etc.)

2. **Upload a pattern image**: Click the second upload button and select a pattern or texture image

3. **Add optional instructions**: Type any specific requirements in the text area (e.g., "Make the pattern more subtle")

4. **Click "Apply Pattern to Clothing"**: Wait 10-30 seconds for processing

5. **Download your result**: Click the download button to save the generated image

---

## Step 9: Deploy to Production

### Deploy to Vercel (Recommended)

1. Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/pattern-applier.git
git push -u origin main
```

2. Go to [Vercel](https://vercel.com) and import your repository

3. Add your environment variables in Vercel project settings:
   - `GEMINI_API_KEY`
   - (Optional) R2/S3 credentials if using cloud storage

4. Deploy!

### Important: Configure Timeout

For Vercel, you may need to increase the function timeout:

- **Hobby plan**: Max 10 seconds (may not be enough)
- **Pro plan**: Add `export const maxDuration = 60;` to your route handler (already included in the code above)

---

## Step 10: Add Cloud Storage (Production Recommended)

Returning base64 images works for prototyping but isn't ideal for production. Here's how to add Cloudflare R2 storage:

### Set Up Cloudflare R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Create a new bucket (e.g., `pattern-applier-images`)
3. Create an API token with read/write permissions
4. Set up a custom domain for public access

### Uncomment Storage Code

In `app/api/apply-pattern/route.ts`, uncomment the storage-related code sections (marked with `/* */` comments).

### Update Environment Variables

Add to `.env.local`:

```
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_key_here
R2_SECRET_ACCESS_KEY=your_secret_here
R2_BUCKET_NAME=pattern-applier-images
R2_PUBLIC_URL=https://images.yourdomain.com
```

Now generated images will be uploaded to R2 and returned as permanent URLs instead of base64 strings.

---

## Troubleshooting

### "API key not valid"
- Double-check your `.env.local` file contains the correct key
- Restart your dev server after adding environment variables
- Ensure the key has no extra spaces or quotes

### "Request timeout"
- Reduce image sizes before uploading (resize to max 2048px)
- Use `gemini-2.5-flash-image` instead of the Pro model for faster results
- On Vercel Hobby, upgrade to Pro for longer function timeouts

### "No image generated"
- Check the browser console and terminal for detailed error messages
- Try simpler patterns first (solid colors, basic stripes)
- Ensure both images are valid JPG or PNG files under 10MB

### Poor quality results
- Use the Pro model: `gemini-3-pro-image-preview`
- Improve your prompt with more specific instructions
- Use higher resolution input images
- Ensure clothing photos have good lighting and simple backgrounds

---

## Advanced: Rate Limiting

Add rate limiting to prevent abuse:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Update `app/api/apply-pattern/route.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requests per hour
});

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ... rest of your code
}
```

---

## Advanced: Job Queue for Async Processing

For high-volume apps, add a job queue:

```bash
npm install bullmq ioredis
```

This allows users to submit jobs and poll for results, preventing timeout issues.

---

## Cost Estimation

### Gemini API Pricing (as of January 2026)
- **gemini-2.5-flash-image**: ~$0.004 per image
- **gemini-3-pro-image-preview**: ~$0.02 per image

### Example Monthly Costs
- 1,000 generations/month (Flash): ~$4
- 1,000 generations/month (Pro): ~$20

---

## Next Steps

- Add user authentication (Clerk, NextAuth.js)
- Store generation history in a database (PostgreSQL, Supabase)
- Add batch processing for multiple clothing items
- Implement image editing features (crop, rotate, adjust before processing)
- Add social sharing features
- Create a gallery of generated designs

---

## Resources

- [Google Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel Deployment](https://vercel.com/docs)

---

## Support

If you encounter issues:
1. Check the browser console for client-side errors
2. Check terminal/Vercel logs for server-side errors
3. Review the Gemini API status page
4. Ensure your API key has sufficient quota

---

**You're all set! Start uploading clothing and patterns to see the magic happen.** 🎨✨
