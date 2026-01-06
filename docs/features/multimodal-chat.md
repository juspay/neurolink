---
title: Multimodal Chat Experiences
description: Stream text and images together with automatic provider fallbacks and format conversion
keywords: multimodal, images, vision, chat, streaming, text and images, visual AI
---

# Multimodal Chat Experiences

NeuroLink 7.47.0 introduces full multimodal pipelines so you can mix text, URLs, and local images in a single interaction. The CLI, SDK, and loop sessions all use the same message builder, ensuring parity across workflows.

## Images {#images}

NeuroLink provides comprehensive image support across all vision-capable providers. Images can be provided as local file paths, HTTPS URLs, or Buffer objects, and are automatically converted to the provider's required encoding format.

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

### Image Alt Text for Accessibility

NeuroLink supports alt text for images, which is helpful for accessibility (screen readers) and providing additional context to AI models. Alt text is automatically included as context in the prompt sent to AI providers.

```typescript
import { readFileSync } from "node:fs";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Using images with alt text for accessibility
const result = await neurolink.generate({
  input: {
    text: "Compare these two charts and summarize the trends",
    images: [
      // (1)!
      {
        data: readFileSync("./charts/q1-revenue.png"),
        altText: "Q1 2024 revenue chart showing 15% growth", // (2)!
      },
      {
        data: "https://example.com/charts/q2-revenue.png",
        altText: "Q2 2024 revenue chart showing 22% growth", // (3)!
      },
    ],
  },
  provider: "openai",
});
```

1. Images can be objects with `data` and `altText` properties
2. Alt text for local file - helps AI understand the image context
3. Alt text for remote URL - provides additional context for accessibility

You can also mix simple images with alt-text-enabled images:

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze these images",
    images: [
      readFileSync("./simple-image.png"), // Simple buffer (no alt text)
      "https://example.com/image.jpg", // Simple URL (no alt text)
      {
        data: readFileSync("./important-chart.png"),
        altText: "Critical KPI dashboard for Q3", // With alt text
      },
    ],
  },
  provider: "google-ai",
});
```

!!! tip "Alt Text Best Practices" - Keep alt text concise but descriptive (under 125 characters is ideal) - Focus on the key information the image conveys - Alt text is automatically included as context in the prompt, helping AI models better understand the images

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
- **Alt text** – Add alt text to images for accessibility; the text is included as context for AI models.

## Best Practices

- Provide short captions in the prompt describing each image (e.g., "see `before.png` on the left").
- **Use alt text** for images that convey important information, especially for accessibility compliance.
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

## Troubleshooting

| Symptom                            | Action                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `Image not found`                  | Check relative paths from the directory where you invoked the CLI.                |
| `Provider does not support images` | Switch to a model listed in the table above or enable orchestration.              |
| `Error downloading image`          | Ensure the URL responds with status 200 and does not require auth.                |
| `Large response latency`           | Pre-compress images and reduce resolution to under 2 MP when possible.            |
| `Streaming ends early`             | Disable tools (`--disableTools`) to avoid tool calls that may not support vision. |

## Related Features

**Document Processing:**

- [Office Documents](office-documents.md) – DOCX, PPTX, XLSX processing for Bedrock, Vertex, Anthropic
- [PDF Support](pdf-support.md) – PDF document processing for visual analysis
- [CSV Support](csv-support.md) – CSV file processing with auto-detection

**Q4 2025 Features:**

- [Guardrails Middleware](guardrails.md) – Content filtering for multimodal outputs
- [Auto Evaluation](auto-evaluation.md) – Quality scoring for vision-based responses

**Documentation:**

- [CLI Commands](../cli/commands.md) – CLI flags & options
- [SDK API Reference](../sdk/api-reference.md) – Generate/stream APIs
- [Troubleshooting](../troubleshooting.md) – Extended error catalogue
