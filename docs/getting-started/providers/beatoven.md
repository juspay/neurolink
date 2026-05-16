---
title: Beatoven.ai Provider Guide (music)
description: Generate royalty-free background music via Beatoven.ai
keywords: beatoven, music generation, background music, royalty-free
---

# Beatoven.ai Provider Guide

**Royalty-free background / cinematic music via Beatoven.ai**

---

## Overview

[Beatoven.ai](https://www.beatoven.ai/) generates royalty-free music
optimized for background scoring, brand music, and cinematic content.
NeuroLink dispatches via `output: { mode: 'music' }`.

### Key Facts

- **Endpoint**: `POST /api/v1/tracks/compose` + status polling
- **Output**: MP3 / WAV
- **Async**: Submit + poll (up to 5 minutes)
- **Max duration**: 5 minutes per track

---

## Quick Start

### 1. Get an API Key

[https://www.beatoven.ai/dashboard](https://www.beatoven.ai/dashboard)

### 2. Configure

```bash
BEATOVEN_API_KEY=your-key
```

### 3. Generate Music

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync } from "node:fs";

const ai = new NeuroLink();
const result = await ai.generate({
  provider: "vertex",
  output: {
    mode: "music",
    music: {
      provider: "beatoven",
      prompt: "Warm corporate background loop, mid-tempo",
      duration: 60,
      genre: "corporate",
      mood: "uplifting",
    },
  },
});
if (result.music?.buffer) {
  writeFileSync("./beatoven.mp3", result.music.buffer);
}
```

---

## CLI Usage

```bash
pnpm run cli generate "Cinematic ambient pad" \
  --provider beatoven --musicDuration 90 --musicGenre cinematic \
  --musicOutput ./music.mp3
```

---

## Configuration Reference

| Environment Variable | Required | Description       |
| -------------------- | -------- | ----------------- |
| `BEATOVEN_API_KEY`   | Yes      | Beatoven API key  |
| `BEATOVEN_BASE_URL`  | No       | Base URL override |

---

## See Also

- [Lyria Provider](/docs/getting-started/providers/lyria)
- [ElevenLabs Music Provider](/docs/getting-started/providers/elevenlabs-music)
