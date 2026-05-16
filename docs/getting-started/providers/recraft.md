---
title: Recraft Provider Guide (image-gen)
description: Use Recraft V3 (raster + vector SVG) for image generation through NeuroLink
keywords: recraft, image generation, svg, vector, brand styles
---

# Recraft Provider Guide

**Raster + native SVG image generation via Recraft V3**

---

## Overview

[Recraft](https://www.recraft.ai/) generates both raster (PNG/JPEG/WebP)
and vector (SVG) images. The vector output is especially useful for
icon sets, marketing assets, and brand-consistent illustrations.

### Key Facts

- **Endpoint**: `POST https://external.api.recraft.ai/v1/images/generations`
- **Default model**: `recraftv3` (raster); use `recraftv3-svg` for SVG
- **Output formats**: PNG, JPEG, WebP, SVG

---

## Quick Start

### 1. Get an API Key

[https://www.recraft.ai/profile/api](https://www.recraft.ai/profile/api)

### 2. Configure

```bash
RECRAFT_API_KEY=your-key
```

### 3. Generate an Image

```typescript
import { NeuroLink } from "@juspay/neurolink";
const ai = new NeuroLink();
const result = await ai.generate({
  provider: "recraft",
  model: "recraftv3",
  input: { text: "A minimal flat illustration of a coffee cup" },
});
```

---

## Supported Models

| Model ID        | Output | Notes                     |
| --------------- | ------ | ------------------------- |
| `recraftv3`     | Raster | Default; current flagship |
| `recraftv3-svg` | SVG    | Native vector output      |
| `recraftv2`     | Raster | Previous generation       |

---

## CLI Usage

```bash
pnpm run cli generate "Minimal flat coffee cup icon" \
  --provider recraft --model recraftv3-svg --imageOutput ./cup.svg
```

---

## Configuration Reference

| Environment Variable | Required | Default     |
| -------------------- | -------- | ----------- |
| `RECRAFT_API_KEY`    | Yes      | —           |
| `RECRAFT_MODEL`      | No       | `recraftv3` |

---

## See Also

- [Stability AI Provider](/docs/getting-started/providers/stability)
- [Ideogram Provider](/docs/getting-started/providers/ideogram)
