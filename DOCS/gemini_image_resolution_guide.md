# Gemini API Image Generation: 2K & 4K Resolution Guide

Here's a clear implementation guide for generating high-resolution images (2K and 4K) using the Gemini API (Nano Banana).

## Key Points

**Model to Use:** `gemini-3-pro-image-preview` (Nano Banana Pro)
- This is the only Gemini model that supports 2K and 4K output
- The smaller `gemini-2.5-flash-image` model does NOT support high-resolution generation

**Resolution Options:** `"1K"`, `"2K"`, `"4K"`
- Default is 1K if you don't specify
- **IMPORTANT:** Must use uppercase "K" (e.g., `"2K"`) — lowercase like `"2k"` will be rejected

## Implementation Examples

### Python

```python
from google import genai
from google.genai import types

client = genai.Client(api_key="YOUR_API_KEY")

prompt = "Your image description here"
aspect_ratio = "16:9"  # Options: "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
resolution = "4K"      # Options: "1K", "2K", "4K"

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=resolution  # This is the key parameter
        ),
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("output_4k.png")
```

### JavaScript/Node.js

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({apiKey: "YOUR_API_KEY"});

const prompt = "Your image description here";
const aspectRatio = "16:9";
const resolution = "4K";  // "1K", "2K", or "4K"

const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: prompt,
    config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: resolution  // Key parameter for resolution
        }
    }
});

for (const part of response.candidates[0].content.parts) {
    if (part.text) {
        console.log(part.text);
    } else if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync("output_4k.png", buffer);
    }
}
```

### REST API (cURL)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Your image description here"}]
    }],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {
        "aspectRatio": "16:9",
        "imageSize": "4K"
      }
    }
  }'
```

## Critical Implementation Notes

1. **Model Name:** Always use `"gemini-3-pro-image-preview"` for high-res output

2. **Case Sensitivity:** The `imageSize` parameter MUST use uppercase "K":
   - ✅ Correct: `"1K"`, `"2K"`, `"4K"`
   - ❌ Wrong: `"1k"`, `"2k"`, `"4k"` (will be rejected)

3. **Config Structure:** The resolution is set via:
   - `imageConfig.imageSize` (Python/REST)
   - `imageConfig.imageSize` (JavaScript)

4. **Multi-turn Chat:** For iterative editing, you can change resolution per request by updating the config on each `send_message()` call

## Example for Multi-turn with Different Resolutions

```python
# Start with 1K for quick iteration
chat = client.chats.create(
    model="gemini-3-pro-image-preview",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE']
    )
)

response = chat.send_message("Create a logo design")

# Then refine at 4K for final output
response = chat.send_message(
    "Make the text bolder",
    config=types.GenerateContentConfig(
        image_config=types.ImageConfig(
            image_size="4K"  # Upgrade to 4K for final
        )
    )
)
```

## When to Use Each Resolution

- **1K (default):** Fast iteration, testing prompts, lower cost
- **2K:** Balanced quality for web/digital use, reasonable generation time
- **4K:** Maximum detail for print, heavy cropping, professional assets

---

Pass this guide to your coding assistant—everything they need to implement 2K/4K image generation with Gemini API is here!
