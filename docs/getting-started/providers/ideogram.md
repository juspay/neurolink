---
title: Ideogram Provider Guide (image-gen)
description: Use Ideogram V3 for text-aware image generation through NeuroLink
keywords: ideogram, image generation, text-in-image, poster, logo
---

# Ideogram Provider Guide

**Text-aware image generation via Ideogram V3**

---

## Overview

[Ideogram](https://ideogram.ai/) generates images with crisp, accurate
in-image text — making it the go-to choice for posters, logos, and
typographic art. NeuroLink dispatches via the modality router
(`output: { mode: 'image' }` or simply `provider: 'ideogram'` with an
image model).

### Key Facts

- **Endpoint**: `POST https://api.ideogram.ai/v1/ideogram-v3/generate`
- **Default model**: `V_3`
- **Strengths**: Posters, logos, lettering, typography-heavy designs

---

## Quick Start

### 1. Get an API Key

[https://ideogram.ai/manage-api](https://ideogram.ai/manage-api)

### 2. Configure

```bash
IDEOGRAM_API_KEY=your-key
```

### 3. Generate an Image

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync } from "node:fs";

const ai = new NeuroLink();
const result = await ai.generate({
  provider: "ideogram",
  model: "V_3",
  input: { text: 'Movie poster with the title "Test Run", dramatic lighting' },
});
if (result.imageOutput?.base64) {
  writeFileSync(
    "./poster.png",
    Buffer.from(result.imageOutput.base64, "base64"),
  );
}
```

---

## Supported Models

| Model ID | Notes                     |
| -------- | ------------------------- |
| `V_3`    | Default; current flagship |
| `V_2`    | Earlier version           |

---

## CLI Usage

```bash
pnpm run cli generate 'Vintage travel poster: "Tokyo 1985"' \
  --provider ideogram --imageOutput ./poster.png
```

---

## Configuration Reference

| Environment Variable | Required | Default |
| -------------------- | -------- | ------- |
| `IDEOGRAM_API_KEY`   | Yes      | —       |
| `IDEOGRAM_MODEL`     | No       | `V_3`   |

---

## See Also

- [Stability AI Provider](/docs/getting-started/providers/stability)
- [Recraft Provider](/docs/getting-started/providers/recraft)
