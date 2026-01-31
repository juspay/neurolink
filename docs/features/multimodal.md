---
title: Multimodal Capabilities Guide
description: Comprehensive guide to NeuroLink's multimodal input support including images, PDFs, CSV files, and audio
keywords: multimodal, vision, images, pdf, csv, audio, document processing, file inputs
---

# Multimodal Capabilities Guide

NeuroLink provides comprehensive multimodal support, allowing you to combine text with various media types in a single AI interaction. This guide covers all supported input types, provider capabilities, and best practices.

## Overview

**Supported Input Types:**

- **Images** - JPEG, PNG, GIF, WebP, HEIC (vision-capable models)
- **PDFs** - Document analysis and content extraction
- **CSV/Spreadsheets** - Data analysis and tabular content processing
- **Audio** - Transcription, analysis, and real-time voice input ([Audio Input Guide](audio-input.md))

All multimodal inputs work seamlessly across both the CLI and SDK, with automatic format detection and provider-specific optimization.

---

## Provider Support Matrix

Not all providers support all multimodal capabilities. Use this matrix to select the right provider for your use case.

### Vision (Images)

| Provider              | Supported | Recommended Models                                     | Max Images | Max Size | Notes                                |
| --------------------- | --------- | ------------------------------------------------------ | ---------- | -------- | ------------------------------------ |
| **OpenAI**            | ✅        | `gpt-4o`, `gpt-4o-mini`, `gpt-5.2`                     | 10         | ~20 MB   | Best for general vision tasks        |
| **Azure OpenAI**      | ✅        | `gpt-4o`, `gpt-4o-mini`                                | 10         | ~20 MB   | Same as OpenAI                       |
| **Google AI Studio**  | ✅        | `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-3-flash` | 16         | ~20 MB   | Excellent for visual reasoning       |
| **Google Vertex AI**  | ✅        | `gemini-2.5-pro`, `gemini-2.5-flash`, Claude models    | 16/20      | ~20 MB   | Gemini: 16 images, Claude: 20 images |
| **Anthropic**         | ✅        | `claude-3.5-sonnet`, `claude-3.7-sonnet`               | 20         | ~20 MB   | Strong visual understanding          |
| **AWS Bedrock**       | ✅        | Claude models                                          | 20         | ~20 MB   | Same as Anthropic                    |
| **Ollama**            | ✅        | `llava`, `bakllava`, `llava-phi3`                      | 10         | Varies   | Local vision models                  |
| **LiteLLM**           | ✅        | Depends on upstream                                    | 10         | Varies   | Proxy to vision-capable models       |
| **Mistral**           | ✅        | `pixtral-12b-2409`, `pixtral-large-2411`               | 10         | ~20 MB   | Multimodal Mistral models            |
| **OpenRouter**        | ✅        | Depends on model                                       | 10         | Varies   | Routes to various vision models      |
| **Hugging Face**      | ⚠️        | Limited                                                | Varies     | Varies   | Model-dependent                      |
| **AWS SageMaker**     | ❌        | N/A                                                    | -          | -        | Not supported                        |
| **OpenAI Compatible** | ⚠️        | Depends on endpoint                                    | Varies     | Varies   | Server-dependent                     |

**Legend:**

- ✅ Full support with multiple models
- ⚠️ Limited or server-dependent support
- ❌ Not supported

### PDF Documents

| Provider              | Supported | Max Size | Max Pages | Processing Mode  | Notes                                   |
| --------------------- | --------- | -------- | --------- | ---------------- | --------------------------------------- |
| **Google Vertex AI**  | ✅        | 5 MB     | 100       | Native PDF       | Best for document analysis              |
| **Anthropic**         | ✅        | 5 MB     | 100       | Native PDF       | Claude excels at document understanding |
| **AWS Bedrock**       | ✅        | 5 MB     | 100       | Native PDF       | Via Claude models                       |
| **Google AI Studio**  | ✅        | 2000 MB  | 100       | Native PDF       | Handles very large files                |
| **OpenAI**            | ✅        | 10 MB    | 100       | Files API        | `gpt-4o`, `gpt-4o-mini`, `o1`           |
| **Azure OpenAI**      | ✅        | 10 MB    | 100       | Files API        | Uses OpenAI Files API                   |
| **LiteLLM**           | ✅        | 10 MB    | 100       | Proxy            | Depends on upstream model               |
| **OpenAI Compatible** | ✅        | 10 MB    | 100       | Varies           | Server-dependent                        |
| **Mistral**           | ✅        | 10 MB    | 100       | Native PDF       | Native support                          |
| **Hugging Face**      | ✅        | 10 MB    | 100       | Model-dependent  | Varies by model                         |
| **Ollama**            | ❌        | -        | -         | -                | Not supported                           |
| **OpenRouter**        | ⚠️        | Varies   | Varies    | Depends on model | Route-dependent                         |
| **AWS SageMaker**     | ❌        | -        | -         | -                | Not supported                           |

### CSV/Spreadsheet Data

| Provider          | Supported | Max Rows | Format Options      | Notes                                 |
| ----------------- | --------- | -------- | ------------------- | ------------------------------------- |
| **All Providers** | ✅        | 10,000   | raw, json, markdown | Universal support - processed as text |

CSV support works with **all providers** because files are converted to text before sending to the AI model. The file is parsed and formatted (raw CSV, JSON, or Markdown table) before inclusion in the prompt.

**Format Recommendations:**

- **Raw format** - Best for large files (minimal token usage)
- **JSON format** - Best for structured data processing
- **Markdown format** - Best for small datasets (<100 rows), readable tables

### Audio Input

| Provider             | Native Audio | Transcription | Real-time | Max Duration | Notes                               |
| -------------------- | ------------ | ------------- | --------- | ------------ | ----------------------------------- |
| **Google AI Studio** | ✅           | ✅            | ✅        | 1 hour       | Best for real-time voice            |
| **Google Vertex AI** | ✅           | ✅            | ✅        | 1 hour       | Native Gemini audio support         |
| **OpenAI**           | ❌           | ✅ Whisper    | ❌        | 25 MB        | Excellent transcription accuracy    |
| **Azure OpenAI**     | ❌           | ✅ Whisper    | ❌        | 25 MB        | Via Whisper integration             |
| **Anthropic**        | ❌           | Via fallback  | ❌        | -            | Uses transcription approach         |
| **AWS Bedrock**      | ❌           | Via fallback  | ❌        | -            | Uses transcription approach         |
| **Others**           | ❌           | Via fallback  | ❌        | -            | Audio transcribed before processing |

For comprehensive audio documentation, see the [Audio Input Guide](audio-input.md).

---

## Image Input

### Quick Start

**CLI:**

```bash
# Single image
npx @juspay/neurolink generate "Describe this interface" \
  --image ./designs/dashboard.png --provider google-ai

# Remote URL
npx @juspay/neurolink generate "Analyze this diagram" \
  --image https://example.com/architecture.png --provider openai

# Multiple images
npx @juspay/neurolink generate "Compare these screenshots" \
  --image ./before.png \
  --image ./after.png \
  --provider anthropic
```

**SDK:**

```typescript
import { readFileSync } from "node:fs";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ enableOrchestration: true });

const result = await neurolink.generate({
  input: {
    text: "Analyze these product screenshots",
    images: [
      readFileSync("./homepage.png"), // Local file as Buffer
      "https://example.com/chart.png", // Remote URL
    ],
  },
  provider: "google-ai",
});
```

### Image Formats Supported

**Accepted formats:**

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- HEIC (`.heic`, `.heif`) - iOS photos

**Input methods:**

- **Buffer objects** - `readFileSync()` from Node.js
- **Local file paths** - Relative or absolute paths
- **HTTPS URLs** - Remote images (auto-downloaded)

### Image Alt Text (Accessibility)

NeuroLink supports alt text for images, improving accessibility and providing additional context to AI models.

```typescript
const result = await neurolink.generate({
  input: {
    text: "Compare these revenue charts",
    images: [
      {
        data: readFileSync("./q1-revenue.png"),
        altText: "Q1 2024 revenue chart showing 15% growth",
      },
      {
        data: "https://example.com/q2-revenue.png",
        altText: "Q2 2024 revenue chart showing 22% growth",
      },
    ],
  },
  provider: "openai",
});
```

**Alt text best practices:**

- Keep concise (under 125 characters ideal)
- Focus on key information the image conveys
- Alt text is automatically included as context in prompts

### Image Size Limits

**Provider-specific limits:**

- Most providers: ~20 MB per image
- Recommended: Resize images to < 2 MP for faster processing
- Token usage: ~7,000 tokens per image (varies by provider)

**Optimization tips:**

- Compress images before sending for large batches
- Use appropriate resolution (1920x1080 often sufficient)
- Pre-process images to reduce unnecessary detail

---

## PDF Document Input

### Quick Start

**CLI:**

```bash
# Auto-detect PDF
npx @juspay/neurolink generate "Summarize this report" \
  --file ./financial-report.pdf --provider vertex

# Explicit PDF
npx @juspay/neurolink generate "Extract key terms from contract" \
  --pdf ./contract.pdf --provider anthropic

# Multiple PDFs
npx @juspay/neurolink generate "Compare these documents" \
  --pdf ./version1.pdf \
  --pdf ./version2.pdf \
  --provider vertex
```

**SDK:**

```typescript
// Auto-detect (recommended)
await neurolink.generate({
  input: {
    text: "Analyze this document",
    files: ["./report.pdf", "./data.csv"], // Mixed file types
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
```

### PDF Processing Modes

**Provider-specific approaches:**

| Provider                          | Mode       | Token Usage           | Best For                 |
| --------------------------------- | ---------- | --------------------- | ------------------------ |
| **Vertex AI, Anthropic, Bedrock** | Native PDF | ~1,000 tokens/3 pages | Visual + text extraction |
| **Google AI Studio**              | Native PDF | ~1,000 tokens/3 pages | Large files (up to 2 GB) |
| **OpenAI, Azure**                 | Files API  | ~1,000 tokens/3 pages | Text-only mode optimal   |

**Visual vs. Text-only mode:**

- **Visual mode**: Preserves layout, tables, charts (~7,000 tokens/3 pages)
- **Text-only mode**: Extracts text content only (~1,000 tokens/3 pages)

### PDF Best Practices

- **Choose the right provider**: Vertex AI or Anthropic for best results
- **Check file size**: Most providers limit to 5 MB (AI Studio supports 2 GB)
- **Use streaming**: For large documents, streaming provides faster initial results
- **Combine with other files**: Mix PDFs with CSV data and images
- **Be specific in prompts**: "Extract all monetary values" vs. "Tell me about this PDF"
- **Set appropriate token limits**: Recommended 2000-8000 tokens for PDF analysis

---

## CSV/Spreadsheet Input

### Quick Start

**CLI:**

```bash
# Auto-detect CSV
npx @juspay/neurolink generate "Analyze sales trends" \
  --file ./sales_2024.csv

# Explicit CSV with options
npx @juspay/neurolink generate "Summarize data" \
  --csv ./data.csv \
  --csv-max-rows 500 \
  --csv-format raw
```

**SDK:**

```typescript
// Auto-detect (recommended)
await neurolink.generate({
  input: {
    text: "Analyze this sales data",
    files: ["./sales.csv"], // Auto-detected as CSV
  },
});

// Explicit CSV with options
await neurolink.generate({
  input: {
    text: "Compare quarterly data",
    csvFiles: ["./q1.csv", "./q2.csv"],
  },
  csvOptions: {
    maxRows: 1000,
    formatStyle: "json", // or "raw", "markdown"
  },
});
```

### CSV Format Options

**Three format styles:**

1. **Raw format** (default)
   - Best for large files
   - Minimal token usage
   - Preserves original CSV structure

   ```
   name,age,city
   Alice,30,NYC
   Bob,25,LA
   ```

2. **JSON format**
   - Structured data processing
   - Easier for AI to parse
   - Higher token usage

   ```json
   [
     { "name": "Alice", "age": 30, "city": "NYC" },
     { "name": "Bob", "age": 25, "city": "LA" }
   ]
   ```

3. **Markdown format**
   - Readable tables
   - Good for small datasets (<100 rows)
   - Moderate token usage
   ```markdown
   | name  | age | city |
   | ----- | --- | ---- |
   | Alice | 30  | NYC  |
   | Bob   | 25  | LA   |
   ```

### CSV Configuration

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze customer data",
    csvFiles: ["./customers.csv"],
  },
  csvOptions: {
    maxRows: 1000, // Limit rows (default: 1000, max: 10000)
    formatStyle: "json", // Format: "raw" | "json" | "markdown"
    includeHeaders: true, // Include header row (default: true)
  },
});
```

### CSV Best Practices

- **Use raw format for large files** to minimize token usage
- **Use JSON format for structured processing** when AI needs to manipulate data
- **Limit to 1000 rows by default** (configurable up to 10,000)
- **Combine CSV with visualization images** for comprehensive analysis
- **Works with ALL providers** (not just vision-capable models)

---

## Combining Multiple Input Types

NeuroLink excels at combining different media types in a single request.

### Mixed Media Example

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze this product launch: review the presentation, compare sales data, and assess the promotional materials",
    pdfFiles: ["./presentation.pdf"], // Slides
    csvFiles: ["./sales-data.csv"], // Numbers
    images: [
      readFileSync("./promo-banner.png"), // Marketing material
      "https://example.com/ad-campaign.jpg",
    ],
  },
  provider: "vertex", // Supports all input types
});
```

### Streaming with Multimodal

```typescript
const stream = await neurolink.stream({
  input: {
    text: "Analyze this floor plan and cost breakdown",
    images: ["./floor-plan.jpg"],
    csvFiles: ["./costs.csv"],
  },
  provider: "google-ai",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}
```

---

## Configuration & Fine-tuning

### Image-Specific Options

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze these screenshots",
    images: [
      {
        data: readFileSync("./screenshot.png"),
        altText: "Product dashboard showing KPIs",
      },
    ],
  },
  provider: "openai",
  maxTokens: 2000, // Increase for detailed image analysis
});
```

### PDF-Specific Options

```typescript
const result = await neurolink.generate({
  input: {
    text: "Extract financial data from this report",
    pdfFiles: ["./annual-report.pdf"],
  },
  provider: "vertex",
  maxTokens: 8000, // Large token budget for comprehensive extraction
});
```

### Regional Routing

Some providers require regional configuration for optimal performance:

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze this document",
    pdfFiles: ["./contract.pdf"],
  },
  provider: "vertex",
  region: "us-central1", // Vertex AI region
});
```

---

## Best Practices

### General Guidelines

1. **Provide descriptive prompts** - Reference specific images/files by name
2. **Use alt text for accessibility** - Helps both AI and screen readers
3. **Combine analytics + evaluation** - Benchmark multimodal quality before production
4. **Cache remote assets locally** - Avoid repeated downloads for frequently used files
5. **Stream for user-facing apps** - Use `generate()` for structured JSON output

### Image Best Practices

- Provide short captions describing each image in the prompt
- Pre-compress large images to reduce processing time
- Use appropriate image formats (JPEG for photos, PNG for diagrams)
- Consider token limits when sending multiple images

### PDF Best Practices

- Choose providers with native PDF support (Vertex, Anthropic, Bedrock)
- Be specific about what you need extracted
- Use streaming for large documents
- Set appropriate `maxTokens` (2000-8000 recommended)

### CSV Best Practices

- Use raw format for large datasets
- Use JSON format when AI needs structured data manipulation
- Limit rows to avoid token exhaustion
- Combine with images for visual + numerical analysis

---

## Troubleshooting

### Common Issues

| Issue                                  | Solution                                                          |
| -------------------------------------- | ----------------------------------------------------------------- |
| **"Image not found"**                  | Check file paths are relative to CWD where CLI is invoked         |
| **"Provider does not support images"** | Switch to vision-capable provider (see matrix above)              |
| **"Error downloading image"**          | Ensure URL returns HTTP 200 and doesn't require authentication    |
| **"Large response latency"**           | Pre-compress images and reduce resolution to < 2 MP               |
| **"Streaming ends early"**             | Disable tools (`--disableTools`) to avoid tool call interruptions |
| **"PDF too large"**                    | Use Google AI Studio (2 GB limit) or split into smaller chunks    |
| **"CSV token overflow"**               | Reduce `maxRows` or use raw format instead of JSON/markdown       |

### Provider-Specific Issues

**OpenAI/Azure:**

- Images must be < 20 MB
- PDFs processed via Files API (may take longer)

**Google AI Studio/Vertex:**

- Best for large PDFs (AI Studio supports up to 2 GB)
- Gemini models have excellent visual reasoning

**Anthropic/Bedrock:**

- Claude excels at document understanding
- Strong visual and text analysis capabilities

**Ollama:**

- Use vision-capable models like `llava`, `bakllava`
- Local processing - no cloud API required

---

## Related Features

**Document Processing:**

- [Office Documents](office-documents.md) - DOCX, PPTX, XLSX for Bedrock, Vertex, Anthropic
- [PDF Support](pdf-support.md) - Detailed PDF processing guide
- [CSV Support](csv-support.md) - Advanced CSV processing techniques

**Q4 2025 Features:**

- [Guardrails Middleware](guardrails.md) - Content filtering for multimodal outputs
- [Auto Evaluation](auto-evaluation.md) - Quality scoring for vision-based responses

**Advanced Features:**

- [Audio Input](audio-input.md) - Transcription, analysis, and real-time voice
- [TTS Integration](tts.md) - Text-to-Speech audio output
- [Video Generation](video-generation.md) - AI-powered video creation

**Documentation:**

- [CLI Commands](../cli/commands.md) - CLI flags and options reference
- [SDK API Reference](../sdk/api-reference.md) - Complete API documentation
- [Troubleshooting](../troubleshooting.md) - Extended error catalog

---

## Examples & Recipes

### Example 1: Product Analysis

Analyze a product page with screenshot, description, and pricing data:

```typescript
const analysis = await neurolink.generate({
  input: {
    text: "Analyze this product: review the screenshot, pricing data, and provide recommendations",
    images: [readFileSync("./product-screenshot.png")],
    csvFiles: ["./pricing-tiers.csv"],
  },
  provider: "google-ai",
  maxTokens: 3000,
});
```

### Example 2: Document Comparison

Compare two versions of a contract:

```typescript
const comparison = await neurolink.generate({
  input: {
    text: "Compare these two contract versions and highlight key differences",
    pdfFiles: ["./contract-v1.pdf", "./contract-v2.pdf"],
  },
  provider: "anthropic",
  maxTokens: 5000,
});
```

### Example 3: Data Visualization Analysis

Analyze charts and underlying data together:

```typescript
const dataAnalysis = await neurolink.generate({
  input: {
    text: "Analyze these sales charts and verify against the raw data",
    images: [
      "https://example.com/q1-chart.png",
      "https://example.com/q2-chart.png",
    ],
    csvFiles: ["./sales-data.csv"],
  },
  provider: "vertex",
  enableAnalytics: true,
  enableEvaluation: true,
});
```

---

## Summary

NeuroLink's multimodal capabilities provide:

✅ **Universal input support** - Images, PDFs, CSV files
✅ **Provider flexibility** - Extensive provider compatibility matrix
✅ **Automatic format detection** - Smart file type recognition
✅ **Accessibility features** - Alt text support for images
✅ **Production-ready** - Battle-tested at enterprise scale
✅ **Developer-friendly** - Works seamlessly across CLI and SDK

**Next Steps:**

1. Review the [provider support matrix](#provider-support-matrix) to select the right provider
2. Try the [quick start examples](#quick-start) with your use case
3. Explore [advanced recipes](#examples-recipes) for complex scenarios
4. Check [troubleshooting](#troubleshooting) if you encounter issues
