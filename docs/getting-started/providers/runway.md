---
title: Runway Provider Guide (video)
description: Generate videos via Runway's Gen-3 / Gen-4 API through NeuroLink
keywords: runway, video generation, gen-3, gen-4, ai video
---

# Runway Provider Guide

**Image-to-video generation via Runway Gen-3 / Gen-4**

---

## Overview

[Runway](https://runwayml.com/) ships the Gen-3 and Gen-4 video models
behind a REST API. NeuroLink dispatches via `output: { mode: 'video' }`
with `provider: "runway"`.

### Key Facts

- **Endpoint**: `POST https://api.dev.runwayml.com/v1/image_to_video` (production endpoint may differ — check Runway dashboard)
- **Auth**: Bearer token
- **Async**: Submit + poll
- **Output**: MP4

---

## Quick Start

### 1. Get an API Key

[https://app.runwayml.com/settings/developer](https://app.runwayml.com/settings/developer)

### 2. Configure

```bash
RUNWAY_API_KEY=your-key
```

### 3. Generate a Video

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFileSync, writeFileSync } from "node:fs";

const ai = new NeuroLink();
const result = await ai.generate({
  provider: "runway",
  output: {
    mode: "video",
    video: { provider: "runway", resolution: "720p", length: 5 },
  },
  input: {
    text: "Sci-fi establishing shot, soft golden hour light",
    images: [readFileSync("./input.jpg")],
  },
});
if (result.video?.data) {
  writeFileSync("./output.mp4", result.video.data);
}
```

---

## CLI Usage

```bash
pnpm run cli generate "Camera slowly orbits the subject" \
  --image ./portrait.jpg \
  --provider runway --videoOutput ./output.mp4
```

---

## Configuration Reference

| Environment Variable | Required | Description    |
| -------------------- | -------- | -------------- |
| `RUNWAY_API_KEY`     | Yes      | Runway API key |

---

## See Also

- [Kling Provider](/docs/getting-started/providers/kling)
- [Vertex Veo Provider](/docs/getting-started/providers/google-vertex)
