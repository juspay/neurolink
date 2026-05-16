---
title: Stability AI Provider Guide
description: Direct image generation via Stability AI — Stable Image Ultra/Core, SD 3.5 Large/Medium
keywords: stability, stable-diffusion, stable-image-ultra, stable-image-core, sd-3.5, image-generation, sdxl
---

# Stability AI Provider Guide

**Direct image generation — image-only provider with no chat / streaming
(use the `imageOutput.base64` field on the result)**

---

## Overview

Stability AI hosts the Stable Diffusion family + Stable Image Ultra /
Core. NeuroLink wraps `api.stability.ai/v2beta/stable-image/generate/{model}`
so image generation works through the same `nl.generate()` flow as the
LLM-routed image-gen providers (DALL-E on OpenAI, Imagen on Vertex).

- **`stable-image-ultra`** — flagship quality (default)
- **`stable-image-core`** — fast tier
- **`sd3.5-large`**, **`sd3.5-large-turbo`**, **`sd3.5-medium`** — open-weight Stable Diffusion 3.5

### Key Facts

- **Protocol**: REST `/v2beta/stable-image/generate/{model}` — multipart/form-data submit, base64 PNG response
- **Default base URL**: `https://api.stability.ai`
- **Default model**: `stable-image-ultra`
- **Output**: PNG (always — `output_format=png` is hard-coded)
- **Streaming / chat / tool calling**: NOT supported (image-only; `executeStream` throws a friendly error)
- **Reference images**: Not supported via this provider (use Replicate-hosted SDXL or Vertex Imagen for img-to-img)
- **Pricing**: Per image — Stable Image Ultra is the most expensive tier

---

## Quick Start

### 1. Get an API Key

Sign up at [https://platform.stability.ai/](https://platform.stability.ai/)
and create an API key at
[https://platform.stability.ai/account/keys](https://platform.stability.ai/account/keys).

### 2. Configure Environment

```bash
# Required
STABILITY_API_KEY=sk-...

# Optional: override the default model (default: stable-image-ultra)
STABILITY_MODEL=stable-image-core

# Optional: override the base URL
# STABILITY_BASE_URL=https://api.stability.ai
```

### 3. Generate Your First Image

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync } from "node:fs";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "stability",
  input: { text: "A serene mountain lake at sunrise, photorealistic" },
});

writeFileSync("./output.png", Buffer.from(result.imageOutput.base64, "base64"));
```

---

## SDK Usage

### Basic Generation (Stable Image Ultra)

```typescript
const result = await ai.generate({
  provider: "stability",
  input: { text: "Cyberpunk Tokyo skyline at night" },
});
```

### Stable Image Core (Fast Tier)

```typescript
const result = await ai.generate({
  provider: "stability",
  model: "stable-image-core",
  input: { text: "A cute corgi puppy" },
});
```

### SD 3.5 Large

```typescript
const result = await ai.generate({
  provider: "stability",
  model: "sd3.5-large",
  input: { text: "Watercolor painting of a coffee cup" },
});
```

### Aspect Ratio + Negative Prompt

The handler reads `aspectRatio` and `negativePrompt` from the options:

```typescript
const result = await ai.generate({
  provider: "stability",
  input: { text: "Portrait of a forest spirit, ethereal lighting" },
  // Provider-specific extras
  aspectRatio: "16:9",
  negativePrompt: "blurry, low quality, deformed",
} as any); // Cast — these fields aren't on the canonical TextGenerationOptions
```

(NeuroLink threads `aspectRatio` and `negativePrompt` through to the
provider when present; canonical typing for image-gen extras is a
follow-up improvement.)

### Per-Call Credentials

```typescript
const result = await ai.generate({
  provider: "stability",
  input: { text: "..." },
  credentials: { stability: { apiKey: "sk-user-key" } },
});
```

---

## CLI Usage

```bash
pnpm run cli generate "A red panda eating bamboo" \
  --provider stability \
  --imageOutput ./panda.png

# Use the fast tier
pnpm run cli generate "A red panda eating bamboo" \
  --provider stability --model stable-image-core \
  --imageOutput ./panda.png

# SD 3.5 Large
pnpm run cli generate "Watercolor painting" \
  --provider stability --model sd3.5-large \
  --imageOutput ./output.png
```

---

## Provider Aliases

| Alias          | Example                   |
| -------------- | ------------------------- |
| `stability`    | `--provider stability`    |
| `stability-ai` | `--provider stability-ai` |
| `sd`           | `--provider sd`           |

---

## Configuration Reference

| Environment Variable | Required | Default                    | Description          |
| -------------------- | -------- | -------------------------- | -------------------- |
| `STABILITY_API_KEY`  | Yes      | —                          | Stability AI API key |
| `STABILITY_MODEL`    | No       | `stable-image-ultra`       | Default model        |
| `STABILITY_BASE_URL` | No       | `https://api.stability.ai` | Base URL             |

---

## Feature Support Matrix

| Feature          | stable-image-ultra  | stable-image-core | sd3.5-large |
| ---------------- | ------------------- | ----------------- | ----------- |
| Image generation | Yes                 | Yes               | Yes         |
| Text-to-image    | Yes                 | Yes               | Yes         |
| Image-to-image   | No (this provider)¹ | No                | No          |
| Aspect ratio     | Yes                 | Yes               | Yes         |
| Negative prompt  | Yes                 | Yes               | Yes         |
| Seed control     | Yes                 | Yes               | Yes         |
| Streaming        | No                  | No                | No          |
| Chat / tools     | No                  | No                | No          |

¹ For image-to-image with Stable Diffusion, use Replicate-hosted SDXL
variants via the [Replicate provider](/docs/getting-started/providers/replicate).

---

## Troubleshooting

### "Invalid Stability AI API key"

```bash
echo $STABILITY_API_KEY
export STABILITY_API_KEY=sk-...
```

Get / rotate at
[https://platform.stability.ai/account/keys](https://platform.stability.ai/account/keys).

### "Stability AI rate limit exceeded"

Stability has per-second rate limits per tier. Implement exponential
backoff or upgrade your tier at
[https://platform.stability.ai/account/credits](https://platform.stability.ai/account/credits).

### "Stability AI declined the request due to content policy"

The prompt triggered Stability's content filter (`finish_reason:
CONTENT_FILTERED`). Adjust the prompt and retry. Use a different model
if you need looser filtering — but note that ALL Stable Image / SD 3.5
models on the hosted API enforce the same policy.

### "Stability AI returned no image"

The upstream returned `finish_reason: ERROR` without an image. Check
the prompt for malformed Unicode or excessive length (>2000 chars).

### "Model not found"

Use one of the documented model IDs: `stable-image-ultra`,
`stable-image-core`, `sd3.5-large`, `sd3.5-large-turbo`, `sd3.5-medium`.
Note: some older Stability models (SDXL 1.0, Stable Diffusion 1.5) are
deprecated on the hosted API — use Replicate to access them.

---

## See Also

- Ideogram — sibling image-gen with strong typography (no setup doc yet; see `src/lib/providers/ideogram.ts`)
- Recraft — sibling image-gen with vector / illustration focus (no setup doc yet; see `src/lib/providers/recraft.ts`)
- [Replicate Provider](/docs/getting-started/providers/replicate) — image-gen via FLUX, SDXL variants, etc.
- [Adding an image-gen provider](/docs/provider-integration/20-adding-image-gen-provider) — internal reference

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
