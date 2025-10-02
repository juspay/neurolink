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

- Provide short captions in the prompt describing each image (e.g., “see `before.png` on the left”).
- Combine analytics + evaluation to benchmark multimodal quality before rolling out widely.
- Cache remote assets locally if you reuse them frequently to avoid repeated downloads.
- Stream when presenting content to end-users; use `generate` when you need structured JSON output.

## Troubleshooting

| Symptom                            | Action                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `Image not found`                  | Check relative paths from the directory where you invoked the CLI.                |
| `Provider does not support images` | Switch to a model listed in the table above or enable orchestration.              |
| `Error downloading image`          | Ensure the URL responds with status 200 and does not require auth.                |
| `Large response latency`           | Pre-compress images and reduce resolution to under 2 MP when possible.            |
| `Streaming ends early`             | Disable tools (`--disableTools`) to avoid tool calls that may not support vision. |

## Related Features

**Q4 2025 Features:**

- [Guardrails Middleware](guardrails.md) – Content filtering for multimodal outputs
- [Auto Evaluation](auto-evaluation.md) – Quality scoring for vision-based responses

**Documentation:**

- [CLI Commands](../cli/commands.md) – CLI flags & options
- [SDK API Reference](../sdk/api-reference.md) – Generate/stream APIs
- [Troubleshooting](../TROUBLESHOOTING.md) – Extended error catalogue
