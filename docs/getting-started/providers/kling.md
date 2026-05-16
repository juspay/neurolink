---
title: Kling AI Provider Guide (video)
description: Generate videos via Kling AI's image-to-video API through NeuroLink
keywords: kling, video generation, image-to-video, ai video
---

# Kling AI Provider Guide

**Image-to-video generation via Kling AI**

---

## Overview

[Kling AI](https://kling.ai/) generates cinematic video clips from an
input image + motion prompt. NeuroLink dispatches via
`output: { mode: 'video' }` with the video handler selecting Kling when
provider is `"kling"`.

### Key Facts

- **Auth**: JWT-signed bearer token
- **Async**: Task submission + polling
- **Output**: MP4
- **Input**: Image + prompt (image is required)

---

## Quick Start

### 1. Get API Credentials

Sign up at [https://kling.ai/](https://kling.ai/) and grab the Access Key
ID + Secret from the developer dashboard.

### 2. Configure

```bash
KLING_ACCESS_KEY=your-access-key
KLING_SECRET_KEY=your-secret-key
```

### 3. Generate a Video

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFileSync, writeFileSync } from "node:fs";

const ai = new NeuroLink();
const result = await ai.generate({
  provider: "kling",
  output: {
    mode: "video",
    video: { provider: "kling", resolution: "720p", length: 5 },
  },
  input: {
    text: "Smooth camera dolly through the scene, cinematic colour grade",
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
pnpm run cli generate "Camera pans left across the city" \
  --image ./skyline.jpg \
  --provider kling --videoOutput ./output.mp4
```

---

## Configuration Reference

| Environment Variable | Required | Description      |
| -------------------- | -------- | ---------------- |
| `KLING_ACCESS_KEY`   | Yes      | Kling access key |
| `KLING_SECRET_KEY`   | Yes      | Kling secret key |

---

## See Also

- [Runway Provider](/docs/getting-started/providers/runway)
- [Vertex Veo Provider](/docs/getting-started/providers/google-vertex)
