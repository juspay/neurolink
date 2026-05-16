---
title: Fish Audio TTS Provider Guide
description: Low-cost Fish Audio TTS — S2 Pro voice cloning + 80% cheaper than ElevenLabs, 14 languages
keywords: fish-audio, tts, text-to-speech, s2-pro, voice-cloning, multilingual
---

# Fish Audio TTS Provider Guide

**Low-cost text-to-speech — S2 Pro voice cloning, multilingual, ~80%
cheaper than ElevenLabs**

---

## Overview

Fish Audio is a low-cost TTS provider focused on voice cloning. NeuroLink
wraps it as a TTSHandler so it slots into the same
`generate({ tts: { provider: "fish-audio" } })` flow as OpenAI / ElevenLabs / Azure / Google AI TTS.

- **Latest model**: `s1` (default) — best quality
- **`speech-1.6`**, **`speech-1.5`** — older / cheaper models
- **Voice cloning**: 15s of reference audio → custom voice id
- **Languages**: 14 (English, Mandarin, Cantonese, Japanese, Korean,
  French, German, Spanish, Italian, Portuguese, Russian, Arabic, Hindi,
  Indonesian)

### Key Facts

- **Protocol**: Native REST API (`POST /v1/tts`)
- **Default base URL**: `https://api.fish.audio`
- **Default model**: `s1`
- **Default voice (reference_id)**: `fb6c0e1ea91e427fb9a93b9bbf0a1e4d` (Generic Female / English)
- **Max text length**: 5000 characters
- **Output formats**: `mp3` (default), `wav`, `pcm16` (raw 16-bit PCM @ 44.1 kHz)
- **Streaming**: Not implemented in this handler (synchronous synthesis only)

---

## Quick Start

### 1. Get an API Key

Sign up at [https://fish.audio/](https://fish.audio/) and create an API
key from the dashboard.

### 2. Configure Environment

```bash
# Required
FISH_AUDIO_API_KEY=...

# Optional: override the default voice (any reference_id from the Fish library)
# FISH_AUDIO_VOICE_ID=...

# Optional: override the base URL
# FISH_AUDIO_BASE_URL=https://api.fish.audio
```

### 3. Synthesize Your First Audio

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync } from "node:fs";

const ai = new NeuroLink();

const result = await ai.generate({
  // The LLM provider doesn't matter — TTS-only flows skip the LLM call
  // when `tts.useAiResponse` is false (default)
  provider: "openai",
  input: { text: "Hello world from Fish Audio" },
  tts: {
    enabled: true,
    provider: "fish-audio",
    format: "mp3",
  },
});

if (result.audio) {
  writeFileSync("./hello.mp3", result.audio.buffer);
}
```

---

## SDK Usage

### Basic Synthesis (Default Voice)

```typescript
const result = await ai.generate({
  provider: "openai",
  input: { text: "The quick brown fox jumps over the lazy dog." },
  tts: { enabled: true, provider: "fish-audio" },
});
```

### Custom Voice (Voice Cloning)

Get a `reference_id` from your Fish Audio dashboard after uploading 15s
of reference audio:

```typescript
const result = await ai.generate({
  provider: "openai",
  input: { text: "..." },
  tts: {
    enabled: true,
    provider: "fish-audio",
    voice: "your-custom-reference-id",
    format: "mp3",
  },
});
```

### TTS-Augmented LLM Response

When `useAiResponse: true`, NeuroLink first calls the LLM, then
synthesizes the LLM output through Fish Audio:

```typescript
const result = await ai.generate({
  provider: "openai", // generates the text
  input: { text: "Tell me a 2-sentence joke" },
  tts: {
    enabled: true,
    provider: "fish-audio",
    useAiResponse: true,
    format: "mp3",
  },
});

console.log(result.content); // joke text
writeFileSync("joke.mp3", result.audio.buffer);
```

### WAV / PCM16 Output

```typescript
// WAV (44.1 kHz)
const wav = await ai.generate({
  provider: "openai",
  input: { text: "..." },
  tts: { enabled: true, provider: "fish-audio", format: "wav" },
});

// PCM16 — raw 16-bit signed-LE PCM, NO RIFF header. Useful for
// realtime streaming pipelines that want raw samples.
const pcm = await ai.generate({
  provider: "openai",
  input: { text: "..." },
  tts: { enabled: true, provider: "fish-audio", format: "pcm16" },
});
```

### Per-Call Credentials

```typescript
const result = await ai.generate({
  provider: "openai",
  input: { text: "..." },
  tts: { enabled: true, provider: "fish-audio" },
  credentials: {
    /* ... no Fish Audio per-call slice yet — set FISH_AUDIO_API_KEY env */
  },
});
```

---

## CLI Usage

```bash
# Basic — default voice + mp3
pnpm run cli generate "Hello world" \
  --tts --tts-provider fish-audio \
  --output ./hello.mp3

# With a custom voice
pnpm run cli generate "Hello world" \
  --tts --tts-provider fish-audio \
  --tts-voice your-custom-reference-id \
  --output ./hello.mp3

# WAV format
pnpm run cli generate "Hello world" \
  --tts --tts-provider fish-audio \
  --tts-format wav --output ./hello.wav
```

---

## Configuration Reference

| Environment Variable  | Required | Default                            | Description                |
| --------------------- | -------- | ---------------------------------- | -------------------------- |
| `FISH_AUDIO_API_KEY`  | Yes      | —                                  | Fish Audio API key         |
| `FISH_AUDIO_VOICE_ID` | No       | `fb6c0e1ea91e427fb9a93b9bbf0a1e4d` | Default reference_id voice |
| `FISH_AUDIO_BASE_URL` | No       | `https://api.fish.audio`           | Base URL                   |

---

## Voice Models

| Model        | Notes                          |
| ------------ | ------------------------------ |
| `s1`         | Latest, best quality (default) |
| `speech-1.6` | Previous flagship              |
| `speech-1.5` | Older / cheaper                |

Voices are identified by `reference_id` strings from the Fish library.
Browse and clone voices in your Fish Audio dashboard.

---

## Feature Support Matrix

| Feature        | Fish Audio            |
| -------------- | --------------------- |
| Text-to-speech | Yes                   |
| Voice cloning  | Yes (15s reference)   |
| Multilingual   | Yes (14 languages)    |
| MP3 output     | Yes                   |
| WAV output     | Yes (44.1 kHz)        |
| PCM16 output   | Yes (raw, no RIFF)    |
| OPUS output    | Falls back to MP3     |
| Streaming      | No (synchronous only) |
| `getVoices()`  | Not implemented       |

---

## Troubleshooting

### "Invalid Fish Audio API key"

```bash
echo $FISH_AUDIO_API_KEY
export FISH_AUDIO_API_KEY=...
```

Get / rotate at [https://fish.audio/](https://fish.audio/).

### "Fish Audio rate limit exceeded"

Free tier has hourly limits. Upgrade your plan or implement exponential
backoff. The handler maps 408 / 429 / 5xx to retriable errors.

### "Fish Audio synthesis failed: 422"

Usually means the `reference_id` is invalid or the text is too long
(>5000 chars). Truncate the text or check the voice id in your dashboard.

### Audio sounds robotic / low quality

Try a higher-quality model (`model: "s1"` if you're on `speech-1.5`) or
clone your own reference voice from a 15s clean audio sample. Default
voices are generic — voice-cloned reference_ids almost always sound
better.

### "PCM16 output is unplayable in audio players"

`pcm16` is RAW samples, not WAV — players need a header. To play, write
a WAV header yourself (44 bytes) before the PCM data, or use the `wav`
format which produces a complete RIFF/WAV file.

---

## See Also

- [TTS Feature Guide](/docs/features/tts) — overall TTS architecture and supported providers
- [ElevenLabs TTS](/docs/getting-started/providers/elevenlabs) — sibling TTS provider with the largest voice library
- [OpenAI TTS](/docs/getting-started/providers/openai-tts) — sibling TTS provider with `tts-1` / `tts-1-hd`
- [Adding a TTS provider](/docs/provider-integration/16-adding-tts-provider) — internal reference for the integration pattern

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
