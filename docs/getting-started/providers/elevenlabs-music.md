---
title: ElevenLabs Music Provider Guide
description: Generate music + sound effects via ElevenLabs Music
keywords: elevenlabs, music, sound effects, sfx, eleven-music
---

# ElevenLabs Music Provider Guide

**Music + sound-effect generation via the ElevenLabs Music / SFX API**

---

## Overview

[ElevenLabs](https://elevenlabs.io/) ships music and sound-effect models
under the same account used for TTS. NeuroLink supports both via
`provider: "elevenlabs-music"` (full musical tracks) and
`provider: "elevenlabs-sound"` (short SFX).

### Key Facts

- **Endpoint**: `POST https://api.elevenlabs.io/v1/music` (and `/v1/sound-generation`)
- **Auth**: `xi-api-key` header (same key as TTS)
- **Output**: MP3

---

## Quick Start

### 1. Get an API Key

[https://elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)

### 2. Configure

```bash
ELEVENLABS_API_KEY=your-key
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
      provider: "elevenlabs-music",
      prompt: "Calm cinematic ambient pad, soft piano, slow tempo",
      duration: 30,
    },
  },
});
if (result.music?.buffer) {
  writeFileSync("./music.mp3", result.music.buffer);
}
```

### Sound Effects

```typescript
const sfx = await ai.generate({
  provider: "vertex",
  output: {
    mode: "music",
    music: {
      provider: "elevenlabs-sound",
      prompt: "A heavy metal door slamming shut, with reverb",
      duration: 4,
    },
  },
});
```

---

## CLI Usage

```bash
pnpm run cli generate "Lo-fi study beat" \
  --provider elevenlabs-music \
  --musicDuration 60 --musicOutput ./music.mp3
```

---

## Configuration Reference

| Environment Variable | Required | Description    |
| -------------------- | -------- | -------------- |
| `ELEVENLABS_API_KEY` | Yes      | ElevenLabs key |

---

## Troubleshooting

- **`401 payment_required`** — your ElevenLabs subscription has an open
  invoice. Complete payment at
  [https://elevenlabs.io/app/subscription](https://elevenlabs.io/app/subscription)
  to re-enable the music endpoint.

---

## See Also

- [Beatoven Provider](/docs/getting-started/providers/beatoven)
- [Lyria Provider](/docs/getting-started/providers/lyria)
- [ElevenLabs TTS](/docs/getting-started/providers/elevenlabs)
