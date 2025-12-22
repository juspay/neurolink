---
title: Video Generation with Veo 3.1
description: Generate professional video content with audio using Google's Veo 3.1 model through image and prompt inputs
keywords: video generation, veo 3.1, google ai, video ads, multimodal, video synthesis, ai video
---

# Video Generation with Veo 3.1

NeuroLink integrates Google's Veo 3.1 model to enable AI-powered video generation with audio from image and text prompt inputs. This feature supports video generation through the SDK.

## What You Get

- **Video with audio** – Generate 8-second video clips with synchronized audio from a single image and text prompt.
- **SDK integration** – Use `neurolink.generateVideo()` to create videos programmatically.
- **Multi-shot workflows** – Chain multiple video generations for longer narratives (e.g., product advertisements).
- **Buffer-based output** – Receive video as Buffer objects for flexible post-processing and merging.
- **Smooth transitions** – Built-in support for merging videos with black fade in/out animations.


## Supported Provider & Model

| Provider    | Model     | Max Duration | Audio Support | Input Requirements    |
| ----------- | --------- | ------------ | ------------- | --------------------- |
| `vertex`    | `veo-3.1` | 8 seconds    | :white_check_mark: Yes        | image + text prompt |

> Veo is currently available through Vertex AI. Ensure you have appropriate API access and credentials.

## Prerequisites

1. Vertex AI credentials with Veo access.
2. Sufficient storage for video buffers (each 8-second video is approximately 2-5 MB).

## Quick Start (CLI)

Generate a video using the CLI by passing an input image and specifying the output video path:

```bash
npx @juspay/neurolink generate "Create a product showcase video" \
  --image ./input.jpg \
  --provider vertex \
  --model veo-3.1 \
  --resolution 720p \
  --length 8 \
  --aspect_ratio 9:16 \
  --audio true \
  --output ./output.mp4
```

**Arguments:**
- `--image`: Path to the input image file
- `--output`: Path to save the generated video
- `--provider`, `--model`, `--resolution`, `--length`, `--aspect_ratio`, `--audio`: Video generation options

This command will generate an 8-second video with audio using the specified image and prompt, saving the result to `./output.mp4`.

## Configuration & Best Practices

### Video Quality Settings

```typescript
const result = await neurolink.generateVideo({
  input: {
    image: "./input.jpg",
    prompt: "Dynamic product showcase",
  },
  provider: "vertex",
  model: "veo-3.1",
  resolution: "720p", // (1)!
  length: 8, // (2)!
  aspect_ratio: "9:16", // (3)!
  audio: true, // (4)!
});
```

1. Resolution: `'720p'`, `'1080p'` (default: `'720p'`)
2. Video length: `4`, `6`, `8` secs (default: `8`)
3. Aspect Ratio: `'9:16'`, `'16:9'` (default: `'9:16'`)
4. Generate Audio: `true`, `false` (default: `true`)

### Best Practices

1. **Prompt Engineering**
   - Be specific about camera movements, lighting, and actions
   - Keep prompts concise but descriptive (50-150 characters optimal)
   - Mention key visual elements from the input image

2. **Image Preparation**
   - Use high-quality images (minimum 720p resolution)
   - Ensure good lighting and clear subject matter
   - Aspect ratio should match desired video output (16:9 recommended)

3. **Shot Planning**
   - Limit to 6-7 total shots for optimal advertisement length (48-56 seconds)
   - Ensure logical narrative flow between shots
   - Reserve last shot for end card/call-to-action

4. **Performance Optimization**
   - Generate videos sequentially to avoid API rate limits
   - Use progress callbacks to provide user feedback

5. **Cost Management**
   - Veo 3.1 generation costs approximately $0.50-$1.00 per 8-second video
   - Estimate costs: `(number of shots) × (cost per video)`

6. **Storage & Delivery**
   - Each 8-second video is approximately 2-5 MB in size
   - Keep temporary buffers in memory when merging multiple shots
   - Clean up after log-out

## API Reference

### `generateVideo()`

Generate a single video from image and prompt.

```typescript
interface GenerateVideoOptions {
  input: {
    image: Buffer | string; // Image buffer, file path, or URL
    prompt: string; // Text description of desired video
  };
  provider: "google-ai" | "vertex";
  model?: string; // Default: 'veo-3.1'
  resolution?: "720p" | "1080p";
  length?: 4 | 6 | 8;
  aspect_ratio?: "9:16" | "16:9";
  audio?: true | false;
}

interface VideoGenerationResult {
  videoBuffer: Buffer;
  duration: number; // In seconds
  size: number; // In bytes
  format: string;
  resolution: string;
  metadata: {
    model: string;
    provider: string;
    timestamp: Date;
    prompt: string;
    seed: string;
  };
}
```