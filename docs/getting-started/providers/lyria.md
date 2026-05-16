---
title: Google Lyria Provider Guide (music)
description: Generate music with Google Lyria 3 via NeuroLink
keywords: lyria, music generation, google ai, lyria-3
---

# Google Lyria Provider Guide

**Music generation via Google Lyria 3 Pro**

---

## Overview

Lyria 3 Pro is Google's high-quality music generation model accessible
through the Google AI Studio API. NeuroLink dispatches via
`output: { mode: 'music' }` with `provider: 'lyria'`.

### Key Facts

- **Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/lyria-3:generateContent`
- **Output**: Base64 WAV audio
- **Auth**: Google AI Studio API key

---

## Quick Start

### 1. Get an API Key

[https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 2. Configure

Any of these env vars work:

```bash
GOOGLE_AI_LYRIA_API_KEY=your-key
# or
GOOGLE_AI_API_KEY=your-key
# or
GEMINI_API_KEY=your-key
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
      provider: "lyria",
      prompt: "Uplifting orchestral cinematic with strings and brass",
      duration: 30,
    },
  },
});
if (result.music?.buffer) {
  writeFileSync("./lyria.wav", result.music.buffer);
}
```

---

## CLI Usage

```bash
pnpm run cli generate "Calm piano melody for studying" \
  --provider lyria --musicDuration 60 --musicOutput ./music.wav
```

---

## Configuration Reference

| Environment Variable      | Required (one-of) | Description            |
| ------------------------- | ----------------- | ---------------------- |
| `GOOGLE_AI_LYRIA_API_KEY` | Yes (one-of)      | Lyria-specific API key |
| `GOOGLE_AI_API_KEY`       | Yes (one-of)      | General Google AI key  |
| `GEMINI_API_KEY`          | Yes (one-of)      | Gemini key (alias)     |

---

## See Also

- [Beatoven Provider](/docs/getting-started/providers/beatoven)
- [ElevenLabs Music Provider](/docs/getting-started/providers/elevenlabs-music)
