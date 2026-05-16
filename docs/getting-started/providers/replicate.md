---
title: Replicate Provider Guide
description: Access thousands of hosted models — LLMs, image gen, video gen, avatars, music — through one Replicate token
keywords: replicate, flux, sdxl, wan-alpha, musetalk, musicgen, llama, mistral, multi-modal
---

# Replicate Provider Guide

**One auth token, five modalities — LLMs + image + video + avatar + music
under a single `REPLICATE_API_TOKEN`**

---

## Overview

Replicate is a universal hosted-model gateway. NeuroLink wraps it as a
multi-modal provider so a single token gets you:

| Modality      | How                                                                        | Default model                      |
| ------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| **LLM**       | `provider: "replicate"` chat / streaming                                   | `meta/meta-llama-3.1-70b-instruct` |
| **Image gen** | `provider: "replicate"` with a model id matching `IMAGE_GENERATION_MODELS` | `black-forest-labs/flux-1.1-pro`   |
| **Video**     | `output: { mode: "video", video: { provider: "replicate" } }`              | `atonamy/wan-alpha`                |
| **Avatar**    | `output: { mode: "avatar", avatar: { provider: "replicate" } }`            | `lucataco/musetalk`                |
| **Music**     | `output: { mode: "music", music: { provider: "replicate" } }`              | `meta/musicgen`                    |

Architectural detail: see [`docs/provider-integration/22-adding-multimodal-provider.md`](/docs/provider-integration/22-adding-multimodal-provider) — Replicate is the canonical worked example.

### Key Facts

- **Protocol**: Async prediction lifecycle — POST `/v1/predictions` →
  poll until `succeeded` → fetch output. NeuroLink uses
  `Prefer: wait=60` so short jobs complete in the initial POST and skip
  polling entirely.
- **Default base URL**: `https://api.replicate.com`
- **Auth**: `Authorization: Token $REPLICATE_API_TOKEN`
- **Pricing**: Per compute-second (not per-token) — NeuroLink reports a
  symbolic per-token rate so cost dashboards stay populated, but real
  billing is via Replicate's invoice
- **Streaming**: Synthetic single-chunk stream from the predict result
  (true SSE streaming planned for a follow-up)
- **Tool calling**: Not supported — Replicate predictions are stateless
- **Reasoning trace**: Model-dependent (e.g., DeepSeek R1 on Replicate
  exposes its reasoning trace in the output array)

---

## Quick Start

### 1. Get an API Token

Sign up at [https://replicate.com/](https://replicate.com/) and create
an API token at
[https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens).

### 2. Configure Environment

```bash
# Required
REPLICATE_API_TOKEN=r8_...

# Optional: override the default LLM model
REPLICATE_MODEL=meta/meta-llama-3.1-70b-instruct

# Optional: override the base URL
# REPLICATE_BASE_URL=https://api.replicate.com
```

### 3. Generate Your First Response

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "replicate",
  input: { text: "Explain how a transformer's attention mechanism works." },
});

console.log(result.content);
```

---

## SDK Usage by Modality

### LLM (chat / streaming)

```typescript
const result = await ai.generate({
  provider: "replicate",
  model: "meta/meta-llama-3.1-405b-instruct",
  input: { text: "Write Python that calculates compound interest." },
});
```

Streaming:

```typescript
const stream = await ai.stream({
  provider: "replicate",
  model: "meta/meta-llama-3.1-70b-instruct",
  input: { text: "Tell me a story" },
});
for await (const chunk of stream.stream) {
  if ("content" in chunk) process.stdout.write(chunk.content);
}
```

### Image Generation

```typescript
const result = await ai.generate({
  provider: "replicate",
  model: "black-forest-labs/flux-1.1-pro",
  input: { text: "A serene mountain lake at sunrise, photorealistic" },
});
const buffer = Buffer.from(result.imageOutput.base64, "base64");
require("fs").writeFileSync("./output.png", buffer);
```

Other supported image models on Replicate (pass via `model:`):

- `black-forest-labs/flux-1.1-pro` (default)
- `black-forest-labs/flux-schnell`
- `stability-ai/stable-diffusion-3.5-large`
- `stability-ai/stable-diffusion-3.5-large-turbo`
- `playgroundai/playground-v2.5-1024px-aesthetic`
- `ideogram-ai/ideogram-v3`

### Video Generation

```typescript
import { readFileSync } from "node:fs";

const sourceImage = readFileSync("./input.jpg");

const result = await ai.generate({
  input: { text: "smooth zoom out", images: [sourceImage] },
  output: {
    mode: "video",
    video: {
      provider: "replicate",
      model: "atonamy/wan-alpha",
      length: 4,
      aspectRatio: "16:9",
    },
  },
});

require("fs").writeFileSync("./output.mp4", result.video.data);
```

### Avatar (MuseTalk)

```typescript
const portrait = readFileSync("./portrait.jpg");
const audio = readFileSync("./narration.mp3");

const result = await ai.generate({
  output: {
    mode: "avatar",
    avatar: {
      provider: "replicate", // or "musetalk" alias
      image: portrait,
      audio,
    },
  },
});

require("fs").writeFileSync("./avatar.mp4", result.avatar.buffer);
```

### Music Generation (MusicGen)

```typescript
const result = await ai.generate({
  output: {
    mode: "music",
    music: {
      provider: "replicate", // or "musicgen" alias
      prompt: "Lo-fi hip-hop beat with vinyl crackle",
      duration: 8,
      tempo: 80,
    },
  },
});

require("fs").writeFileSync("./track.mp3", result.music.buffer);
```

---

## CLI Usage

```bash
# LLM
pnpm run cli generate "Hello" --provider replicate

# Image gen
pnpm run cli generate "A red panda" --provider replicate \
  --model black-forest-labs/flux-1.1-pro --imageOutput ./panda.png

# Video gen
pnpm run cli generate "smooth pan" --image ./input.jpg \
  --outputMode video --videoProvider replicate \
  --videoOutput ./out.mp4

# Avatar
pnpm run cli generate --outputMode avatar \
  --avatarProvider replicate \
  --avatarImage ./portrait.jpg \
  --avatarAudio ./narration.mp3 \
  --avatarOutput ./avatar.mp4

# Music
pnpm run cli generate "Lo-fi beat" \
  --outputMode music --musicProvider replicate \
  --musicTempo 80 --musicDuration 8 --musicOutput ./track.mp3
```

---

## Configuration Reference

| Environment Variable  | Required | Default                            | Description                    |
| --------------------- | -------- | ---------------------------------- | ------------------------------ |
| `REPLICATE_API_TOKEN` | Yes      | —                                  | Replicate API token (`r8_...`) |
| `REPLICATE_MODEL`     | No       | `meta/meta-llama-3.1-70b-instruct` | Default LLM model              |
| `REPLICATE_BASE_URL`  | No       | `https://api.replicate.com`        | Base URL                       |

---

## Feature Support Matrix

| Feature           | LLM                      | Image         | Video             | Avatar | Music |
| ----------------- | ------------------------ | ------------- | ----------------- | ------ | ----- |
| Streaming         | Synthetic (single chunk) | N/A           | N/A               | N/A    | N/A   |
| Tool calling      | No                       | N/A           | N/A               | N/A    | N/A   |
| Structured output | Limited                  | N/A           | N/A               | N/A    | N/A   |
| Vision input      | Model-dependent          | Yes (img2img) | Yes (start frame) | Yes    | No    |

---

## Cost Notes

Replicate bills by **compute seconds**, not by tokens. NeuroLink reports
a symbolic per-token rate so cost-attribution dashboards have non-zero
values, but the authoritative billing is from Replicate's own
[pricing dashboard](https://replicate.com/account/billing).

---

## Troubleshooting

### "Invalid Replicate API token"

```bash
echo $REPLICATE_API_TOKEN
export REPLICATE_API_TOKEN=r8_...
```

Get / rotate at
[https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens).

### "Replicate model 'X' not found"

Use the `owner/name` or `owner/name:version` format. Browse the catalog
at [https://replicate.com/explore](https://replicate.com/explore).

### Cold-start delays

First-call latency on rare models can spike (the inference container
needs to warm). Subsequent calls reuse the warm container. NeuroLink
caps polling at 5 minutes by default — bump
`REPLICATE_BASE_URL` and `Prefer: wait=60` configuration in the lifecycle
helper if you regularly hit this.

### Streaming feels chunky

The current implementation runs the prediction synchronously and emits
a single chunk. True SSE streaming is planned — for now use OpenAI / xAI
/ Groq for low-latency token streaming.

### Output is a URL, not base64

NeuroLink downloads the URL and converts to base64 to keep the
`imageOutput` contract uniform. If you see a raw URL in the result, the
download failed — check network access and Replicate's CDN status.

---

## See Also

- [Adding a multi-modal provider](/docs/provider-integration/22-adding-multimodal-provider) — Replicate as the canonical example
- [Adding a new modality](/docs/provider-integration/21-adding-new-modality) — how Avatar / Music categories were built
- [Video Generation](/docs/features/video-generation) — feature page covering Vertex / Kling / Runway / Replicate
- [`docs/provider-integration/22-adding-multimodal-provider.md`](/docs/provider-integration/22-adding-multimodal-provider) — implementation notes

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
