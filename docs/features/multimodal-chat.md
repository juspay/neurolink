---
title: Multimodal Chat Experiences
description: Stream text and images together with automatic provider fallbacks and format conversion
keywords: multimodal, images, vision, chat, streaming, text and images, visual AI
---

# Multimodal Chat Experiences

NeuroLink 7.47.0 introduces full multimodal pipelines so you can mix text, URLs, and local images in a single interaction. The CLI, SDK, and loop sessions all use the same message builder, ensuring parity across workflows.

## What You Get

- **Unified CLI flag** – `--image` accepts multiple file paths or HTTPS URLs per request.
- **SDK parity** – pass `input.images` (buffers, file paths, or URLs) and stream structured outputs.
- **Provider fallbacks** – orchestration automatically retries compatible multimodal models.
- **Streaming support** – `neurolink stream` renders partial responses while images upload in the background.

!!! tip "Format Support"
The image input accepts three formats: **Buffer objects** (from `readFileSync`), **local file paths** (relative or absolute), or **HTTPS URLs**. All formats are automatically converted to the provider's required encoding.

## Supported Providers & Models

!!! warning "Provider Compatibility"
Not all providers support multimodal inputs. Verify your chosen model has the `vision` capability using `npx @juspay/neurolink models list --capability vision`. Unsupported providers will return an error or ignore image inputs.

| Provider               | Recommended Models                       | Notes                                                     |
| ---------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `google-ai`, `vertex`  | `gemini-2.5-pro`, `gemini-2.5-flash`     | Local files and URLs supported.                           |
| `openai`, `azure`      | `gpt-4o`, `gpt-4o-mini`                  | Requires `OPENAI_API_KEY` or Azure deployment name + key. |
| `anthropic`, `bedrock` | `claude-3.5-sonnet`, `claude-3.7-sonnet` | Bedrock needs region + credentials.                       |
| `litellm`              | Any upstream multimodal model            | Ensure LiteLLM server exposes `vision` capability.        |

> Use `npx @juspay/neurolink models list --capability vision` to see the full list from `config/models.json`.

## Prerequisites

1. Provider credentials with vision/multimodal permissions.
2. Latest CLI (`npm`, `pnpm`, or `npx`) or SDK `>=7.47.0`.
3. Optional: Redis if you want images stored alongside loop-session history.

## CLI Quick Start

```bash
# Attach a local file (auto-converted to base64)
npx @juspay/neurolink generate "Describe this interface" \
  --image ./designs/dashboard.png --provider google-ai

# Reference a remote URL (downloaded on the fly)
npx @juspay/neurolink generate "Summarise these guidelines" \
  --image https://example.com/policy.pdf --provider openai --model gpt-4o

# Mix multiple images and enable analytics/evaluation
npx @juspay/neurolink generate "QA review" \
  --image ./screenshots/before.png \
  --image ./screenshots/after.png \
  --enableAnalytics --enableEvaluation --format json
```

### Streaming & Loop Sessions

```bash
# Stream while uploading a diagram
npx @juspay/neurolink stream "Explain this architecture" \
  --image ./diagrams/system.png

# Persist images inside loop mode (Redis auto-detected when available)
npx @juspay/neurolink loop --enable-conversation-memory
> set provider google-ai
> generate Compare the attached charts --image ./charts/q3.png
```

## SDK Usage

```typescript
import { readFileSync } from "node:fs";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ enableOrchestration: true }); // (1)!

const result = await neurolink.generate({
  input: {
    text: "Provide a marketing summary of these screenshots", // (2)!
    images: [
      // (3)!
      readFileSync("./assets/homepage.png"), // (4)!
      "https://example.com/reports/nps-chart.png", // (5)!
    ],
  },
  provider: "google-ai", // (6)!
  enableEvaluation: true, // (7)!
  region: "us-east-1",
});

console.log(result.content);
console.log(result.evaluation?.overallScore);
```

1. Enable provider orchestration for automatic multimodal fallbacks
2. Text prompt describing what you want from the images
3. Array of images in multiple formats
4. Local file as Buffer (auto-converted to base64)
5. Remote URL (downloaded and encoded automatically)
6. Choose a vision-capable provider
7. Optionally evaluate the quality of multimodal responses

Use `stream()` with the same structure when you need incremental tokens:

```typescript
const stream = await neurolink.stream({
  input: {
    text: "Walk through the attached floor plan",
    images: ["./plans/level1.jpg"], // (1)!
  },
  provider: "openai", // (2)!
});

for await (const chunk of stream) {
  // (3)!
  process.stdout.write(chunk.text ?? "");
}
```

1. Accepts file path, Buffer, or HTTPS URL
2. OpenAI's GPT-4o and GPT-4o-mini support vision
3. Stream text responses while image uploads in background

## Configuration & Tuning

- **Image sources** – Local paths are resolved relative to `process.cwd()`. URLs must be HTTPS.
- **Size limits** – Providers cap images at ~20 MB. Resize or compress large assets before sending.
- **Multiple images** – Order matters; the builder interleaves captions in the order provided.
- **Region routing** – Set `region` on each request (e.g., `us-east-1`) for providers that enforce locality.
- **Loop sessions** – Images uploaded during `loop` are cached per session; call `clear session` to reset.

## Best Practices

- Provide short captions in the prompt describing each image (e.g., "see `before.png` on the left").
- Combine analytics + evaluation to benchmark multimodal quality before rolling out widely.
- Cache remote assets locally if you reuse them frequently to avoid repeated downloads.
- Stream when presenting content to end-users; use `generate` when you need structured JSON output.

## CSV File Support

### Quick Start

```bash
# Auto-detect CSV files
npx @juspay/neurolink generate "Analyze sales trends" \
  --file ./sales_2024.csv

# Explicit CSV with options
npx @juspay/neurolink generate "Summarize data" \
  --csv ./data.csv \
  --csv-max-rows 500 \
  --csv-format raw
```

### SDK Usage

```typescript
// Auto-detect (recommended)
await neurolink.generate({
  input: {
    text: "Analyze this data",
    files: ["./data.csv", "./chart.png"],
  },
});

// Explicit CSV
await neurolink.generate({
  input: {
    text: "Compare quarters",
    csvFiles: ["./q1.csv", "./q2.csv"],
  },
  csvOptions: {
    maxRows: 1000,
    formatStyle: "raw",
  },
});
```

### Format Options

- **raw** (default) - Best for large files, minimal token usage
- **json** - Structured data, easier parsing, higher token usage
- **markdown** - Readable tables, good for small datasets (<100 rows)

### Best Practices

- Use raw format for large files to minimize token usage
- Use JSON format for structured data processing
- Limit to 1000 rows by default (configurable up to 10K)
- Combine CSV with visualization images for comprehensive analysis
- Works with ALL providers (not just vision-capable models)

## PDF File Support

### Quick Start

```bash
# Auto-detect PDF files
npx @juspay/neurolink generate "Summarize this report" \
  --file ./financial-report.pdf \
  --provider vertex

# Explicit PDF processing
npx @juspay/neurolink generate "Extract key terms" \
  --pdf ./contract.pdf \
  --provider anthropic

# Multiple PDFs
npx @juspay/neurolink generate "Compare these documents" \
  --pdf ./version1.pdf \
  --pdf ./version2.pdf \
  --provider vertex
```

### SDK Usage

```typescript
// Auto-detect (recommended)
await neurolink.generate({
  input: {
    text: "Analyze this document",
    files: ["./report.pdf", "./data.csv"],
  },
  provider: "vertex",
});

// Explicit PDF
await neurolink.generate({
  input: {
    text: "Compare Q1 and Q2 reports",
    pdfFiles: ["./q1-report.pdf", "./q2-report.pdf"],
  },
  provider: "anthropic",
});

// Streaming with PDF
const stream = await neurolink.stream({
  input: {
    text: "Summarize this contract",
    pdfFiles: ["./contract.pdf"],
  },
  provider: "vertex",
});
```

### Supported Providers

| Provider              | Max Size | Max Pages | Notes                           |
| --------------------- | -------- | --------- | ------------------------------- |
| **Google Vertex AI**  | 5 MB     | 100       | `gemini-1.5-pro` recommended    |
| **Anthropic**         | 5 MB     | 100       | `claude-3-5-sonnet` recommended |
| **AWS Bedrock**       | 5 MB     | 100       | Requires AWS credentials        |
| **Google AI Studio**  | 2000 MB  | 100       | Best for large files            |
| **OpenAI**            | 10 MB    | 100       | `gpt-4o`, `gpt-4o-mini`, `o1`   |
| **Azure OpenAI**      | 10 MB    | 100       | Uses OpenAI Files API           |
| **LiteLLM**           | 10 MB    | 100       | Depends on upstream model       |
| **OpenAI Compatible** | 10 MB    | 100       | Depends on upstream model       |
| **Mistral**           | 10 MB    | 100       | Native PDF support              |
| **Hugging Face**      | 10 MB    | 100       | Native PDF support              |

**Not supported:** Ollama

### Best Practices

- **Choose the right provider**: Use Vertex AI or Anthropic for best results
- **Check file size**: Most providers limit to 5MB, AI Studio supports up to 2GB
- **Use streaming**: For large documents, streaming gives faster initial results
- **Combine with other files**: Mix PDF with CSV data and images for comprehensive analysis
- **Be specific in prompts**: "Extract all monetary values" vs "Tell me about this PDF"

### Token Usage

PDFs consume significant tokens:

- **Text-only mode**: ~1,000 tokens per 3 pages
- **Visual mode**: ~7,000 tokens per 3 pages

Set appropriate `maxTokens` for PDF analysis (recommended: 2000-8000 tokens).

## Video Support

NeuroLink provides comprehensive video analysis capabilities, enabling you to analyze video content directly with AI. The platform supports both **native video processing** (for Google Gemini) and **frame extraction** (for all other providers).

### Overview

Video support in NeuroLink works as a multimodal input type:

1. **Native video** (Gemini only): Upload full video files for analysis with audio transcription
2. **Frame extraction** (all providers): Extract key frames from videos for vision-capable models
3. **Audio transcription**: Optionally transcribe audio tracks for enhanced context

!!! tip "Provider Selection"
Use **Google AI Studio** or **Vertex AI** for native video support with videos up to 1 hour. For other providers, NeuroLink automatically extracts frames for analysis.

### Supported Formats

| Format | Extension | MIME Type          | Notes                          |
| ------ | --------- | ------------------ | ------------------------------ |
| MP4    | `.mp4`    | `video/mp4`        | Most widely supported          |
| WebM   | `.webm`   | `video/webm`       | Open format, good for web      |
| OGG    | `.ogv`    | `video/ogg`        | Theora video codec             |
| MOV    | `.mov`    | `video/quicktime`  | Apple QuickTime format         |
| AVI    | `.avi`    | `video/x-msvideo`  | Windows standard format        |
| MKV    | `.mkv`    | `video/x-matroska` | Container format, feature-rich |

### SDK Usage

#### Basic Video Analysis

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic video analysis (auto-selects best method for provider)
const result = await neurolink.generate({
  input: {
    text: "Describe what happens in this video",
    videoFiles: ["./demo-video.mp4"],
  },
  provider: "google-ai", // Native video support
});

console.log(result.content);
```

#### Custom Frame Extraction

For non-Gemini providers, control frame extraction:

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze the key moments in this product demo",
    videoFiles: ["./product-demo.mp4"],
  },
  provider: "openai", // Uses frame extraction
  videoOptions: {
    frameCount: 10, // Extract 10 frames (default: 8)
    quality: "high", // Frame quality: low, medium, high
    format: "jpeg", // Output format: jpeg, png
    extractInterval: "uniform", // uniform, scene-based
  },
});
```

#### Native Video with Gemini

For the best video analysis experience, use Google AI Studio or Vertex AI:

```typescript
// Native video upload (Gemini only)
const result = await neurolink.generate({
  input: {
    text: "Provide a detailed summary of this tutorial video",
    videoFiles: ["./tutorial.mp4"],
  },
  provider: "google-ai",
  videoOptions: {
    native: true, // Force native video processing
    transcribe: true, // Include audio transcription
  },
});

// Access transcription if available
console.log("Summary:", result.content);
```

#### Audio Transcription

Enable audio transcription for enhanced video understanding:

```typescript
const result = await neurolink.generate({
  input: {
    text: "Summarize what is being discussed in this meeting recording",
    videoFiles: ["./meeting.mp4"],
  },
  provider: "google-ai",
  videoOptions: {
    transcribe: true, // Extract and transcribe audio
    language: "en", // Language hint for transcription
  },
});
```

#### Streaming with Video

```typescript
const stream = await neurolink.stream({
  input: {
    text: "Walk me through what's happening in this video step by step",
    videoFiles: ["./process.mp4"],
  },
  provider: "google-ai",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}
```

### CLI Usage

#### Basic Video Analysis

```bash
# Analyze a video with auto-detected provider method
npx @juspay/neurolink generate "Describe this video" \
  --video ./demo.mp4 --provider google-ai

# Use explicit frame extraction
npx @juspay/neurolink generate "Analyze key moments" \
  --video ./clip.mp4 --provider openai --video-frames 8
```

#### Frame Extraction Options

```bash
# Custom frame count
npx @juspay/neurolink generate "Summarize this presentation" \
  --video ./presentation.mp4 \
  --video-frames 12 \
  --provider anthropic

# High quality frames
npx @juspay/neurolink generate "Analyze visual details" \
  --video ./product.mp4 \
  --video-quality high \
  --provider openai
```

#### Native Video Processing

```bash
# Native video with Gemini (recommended for long videos)
npx @juspay/neurolink generate "Full video analysis" \
  --video ./long-video.mp4 \
  --video-native \
  --provider google-ai

# Include audio transcription
npx @juspay/neurolink generate "Summarize this podcast video" \
  --video ./podcast.mp4 \
  --video-transcribe \
  --provider vertex
```

#### Multiple Videos

```bash
# Compare two videos
npx @juspay/neurolink generate "Compare these product demos" \
  --video ./demo-v1.mp4 \
  --video ./demo-v2.mp4 \
  --provider google-ai
```

#### Streaming Mode

```bash
# Stream video analysis results
npx @juspay/neurolink stream "Explain this tutorial step by step" \
  --video ./tutorial.mp4 --provider google-ai
```

### Provider Comparison

| Feature                  | Google AI Studio / Vertex | OpenAI / Anthropic   | Other Providers      |
| ------------------------ | ------------------------- | -------------------- | -------------------- |
| **Processing Method**    | Native video              | Frame extraction     | Frame extraction     |
| **Max Duration**         | Up to 1 hour              | ~10 minutes          | ~10 minutes          |
| **Max File Size**        | 2 GB                      | 100 MB               | 100 MB               |
| **Audio Transcription**  | ✅ Native support         | ❌ Not available     | ❌ Not available     |
| **Frame-level Analysis** | ✅ Automatic              | ✅ Via extraction    | ✅ Via extraction    |
| **Real-time Processing** | ✅ Streaming support      | ✅ Streaming support | ✅ Streaming support |
| **Token Efficiency**     | High (native)             | Medium (frames)      | Medium (frames)      |

!!! info "Native vs Frame Extraction"
**Native video** (Gemini) processes the video file directly, preserving temporal information and audio. **Frame extraction** samples key frames from the video and sends them as images, which works with any vision-capable model but loses temporal context.

### Configuration Options

#### Video Processing Options

| Option            | Type    | Default     | Description                                                                       |
| ----------------- | ------- | ----------- | --------------------------------------------------------------------------------- |
| `frameCount`      | number  | `8`         | Number of frames to extract (frame extraction mode)                               |
| `quality`         | string  | `"medium"`  | Frame quality: `"low"`, `"medium"`, `"high"`                                      |
| `format`          | string  | `"jpeg"`    | Frame output format: `"jpeg"`, `"png"`                                            |
| `native`          | boolean | auto-detect | Native if Gemini provider, false otherwise. Set `true` to force native processing |
| `transcribe`      | boolean | `false`     | Enable audio transcription                                                        |
| `language`        | string  | `"en"`      | Language hint for transcription (ISO 639-1)                                       |
| `extractInterval` | string  | `"uniform"` | Frame extraction strategy: `"uniform"`, `"scene-based"`                           |

#### Quality Settings

| Quality  | Resolution | File Size | Tokens per Frame | Use Case                 |
| -------- | ---------- | --------- | ---------------- | ------------------------ |
| `low`    | 256×256    | ~10 KB    | ~85 tokens       | Quick analysis, low cost |
| `medium` | 512×512    | ~40 KB    | ~256 tokens      | Balanced (default)       |
| `high`   | 1024×1024  | ~150 KB   | ~765 tokens      | Detailed visual analysis |

### Best Practices

#### Frame Count Selection

- **4-6 frames**: Short clips (<30 seconds), simple actions
- **8-10 frames**: Standard videos (1-5 minutes), presentations
- **12-16 frames**: Complex videos, tutorials, multi-step processes
- **20+ frames**: Long videos requiring detailed temporal coverage

```typescript
// Short clip - fewer frames sufficient
videoOptions: {
  frameCount: 4,
}

// Tutorial - more frames for step coverage
videoOptions: {
  frameCount: 12,
}
```

#### Quality vs Token Cost

- Use `"low"` quality for initial screening or when token budget is limited
- Use `"medium"` (default) for most use cases
- Use `"high"` only when visual details are critical (product inspection, medical imaging)

```typescript
// Cost-conscious analysis
videoOptions: { quality: "low", frameCount: 6 }

// Detailed inspection
videoOptions: { quality: "high", frameCount: 8 }
```

#### When to Use Native vs Frames

**Use Native Video (Gemini) when:**

- Video is longer than 5 minutes
- Audio context is important
- Temporal sequence matters (cause-effect relationships)
- File size is large (>100 MB)

**Use Frame Extraction when:**

- Using non-Gemini providers
- Quick visual analysis is sufficient
- Token cost optimization is priority
- Only specific moments need analysis

```typescript
// Long meeting recording - use native
await neurolink.generate({
  input: {
    text: "Summarize key discussion points",
    videoFiles: ["./meeting.mp4"],
  },
  provider: "google-ai",
  videoOptions: { native: true, transcribe: true },
});

// Quick product check - use frames
await neurolink.generate({
  input: {
    text: "Is the product packaging intact?",
    videoFiles: ["./package-check.mp4"],
  },
  provider: "openai",
  videoOptions: { frameCount: 4, quality: "medium" },
});
```

### Troubleshooting

| Symptom                           | Cause                                   | Solution                                                 |
| --------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| `Video format not supported`      | Unsupported video codec or container    | Convert to MP4 with H.264 codec                          |
| `File too large`                  | Video exceeds provider limits           | Use Gemini for large files or compress video             |
| `No frames extracted`             | Video too short or corrupted            | Verify video plays correctly, ensure minimum 1s duration |
| `Transcription not available`     | Non-Gemini provider or transcribe=false | Use `--provider google-ai --video-transcribe`            |
| `Provider does not support video` | Model lacks vision capability           | Switch to vision-capable model or enable orchestration   |
| `Timeout during upload`           | Large file + slow connection            | Increase timeout or reduce file size                     |
| `Poor analysis quality`           | Too few frames or low quality           | Increase `frameCount` and use `quality: "high"`          |

### Performance Considerations

#### Token Cost Estimation

**Frame Extraction Mode (medium quality):**

| Video Length | Frame Count | Quality | Estimated Tokens | Approx. Cost (GPT-4o) |
| ------------ | ----------- | ------- | ---------------- | --------------------- |
| 30 seconds   | 4           | medium  | ~1,024 tokens    | ~$0.005               |
| 1 minute     | 8           | medium  | ~2,048 tokens    | ~$0.01                |
| 5 minutes    | 12          | medium  | ~3,072 tokens    | ~$0.015               |
| 10 minutes   | 16          | medium  | ~4,096 tokens    | ~$0.02                |

!!! tip "Quality Impact on Tokens" - **Low quality**: ~85 tokens per frame (good for quick analysis) - **Medium quality**: ~256 tokens per frame (balanced) - **High quality**: ~765 tokens per frame (detailed analysis, 3x medium cost)

**Native Video (Gemini):**

| Video Length | Estimated Tokens | Approx. Cost (Gemini 1.5) |
| ------------ | ---------------- | ------------------------- |
| 1 minute     | ~1,000 tokens    | ~$0.001                   |
| 10 minutes   | ~10,000 tokens   | ~$0.01                    |
| 30 minutes   | ~30,000 tokens   | ~$0.03                    |
| 1 hour       | ~60,000 tokens   | ~$0.06                    |

!!! note "Cost Comparison"
Native video processing with Gemini is typically 2-5x more token-efficient than frame extraction for videos longer than 2 minutes.

#### Processing Time

| Operation              | File Size | Typical Time  |
| ---------------------- | --------- | ------------- |
| Frame extraction       | 10 MB     | 2-5 seconds   |
| Frame extraction       | 100 MB    | 10-30 seconds |
| Native upload (Gemini) | 100 MB    | 5-15 seconds  |
| Native upload (Gemini) | 1 GB      | 30-90 seconds |
| Audio transcription    | 10 min    | 5-10 seconds  |

### Example Use Cases

#### Product Demo Analysis

```typescript
const result = await neurolink.generate({
  input: {
    text: `Analyze this product demo video and provide:
    1. Key features demonstrated
    2. Target audience insights
    3. Suggestions for improvement`,
    videoFiles: ["./product-demo.mp4"],
  },
  provider: "google-ai",
  videoOptions: { frameCount: 12, transcribe: true },
});
```

#### Security Footage Review

```typescript
const result = await neurolink.generate({
  input: {
    text: "Identify any unusual activities or persons in this security footage",
    videoFiles: ["./security-cam.mp4"],
  },
  provider: "vertex",
  videoOptions: { frameCount: 20, quality: "high" },
});
```

#### Tutorial Content Extraction

```typescript
const result = await neurolink.generate({
  input: {
    text: "Create step-by-step instructions from this tutorial video",
    videoFiles: ["./tutorial.mp4"],
  },
  provider: "google-ai",
  videoOptions: { native: true, transcribe: true },
});
```

## Troubleshooting

| Symptom                            | Action                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `Image not found`                  | Check relative paths from the directory where you invoked the CLI.                |
| `Provider does not support images` | Switch to a model listed in the table above or enable orchestration.              |
| `Error downloading image`          | Ensure the URL responds with status 200 and does not require auth.                |
| `Large response latency`           | Pre-compress images and reduce resolution to under 2 MP when possible.            |
| `Streaming ends early`             | Disable tools (`--disableTools`) to avoid tool calls that may not support vision. |
| `Video format not supported`       | Convert video to MP4 with H.264 codec using FFmpeg.                               |
| `Video file too large`             | Use Gemini for large files (up to 2GB) or compress the video.                     |
| `Video transcription unavailable`  | Ensure you're using Google AI/Vertex and `--video-transcribe` is set.             |

## Related Features

**Q4 2025 Features:**

- [Guardrails Middleware](guardrails.md) – Content filtering for multimodal outputs
- [Auto Evaluation](auto-evaluation.md) – Quality scoring for vision-based responses

**Multimodal Support:**

- [PDF Support](pdf-support.md) – PDF document analysis
- [CSV Support](csv-support.md) – CSV data analysis

**Documentation:**

- [CLI Commands](../cli/commands.md) – CLI flags & options
- [SDK API Reference](../sdk/api-reference.md) – Generate/stream APIs
- [Troubleshooting](../TROUBLESHOOTING.md) – Extended error catalogue
