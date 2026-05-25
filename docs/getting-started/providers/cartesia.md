---
title: Cartesia TTS Provider Guide
description: Cartesia Sonic synchronous TTS — low-latency English voices, sub-second turnaround, MP3 / WAV / PCM16 output
keywords: cartesia, sonic, tts, text-to-speech, low-latency, voice-agent
---

# Cartesia TTS Provider Guide

**Low-latency text-to-speech — Cartesia's `sonic-2` model over the
synchronous `/tts/bytes` REST endpoint**

---

## Overview

Cartesia ships two TTS interfaces:

1. A **WebSocket streaming** endpoint used by voice-agent pipelines —
   exposed by NeuroLink's `CartesiaStream` adapter in
   `src/lib/adapters/tts/cartesiaHandler.ts` (driven by the voice server).
2. A **synchronous REST** endpoint (`POST /tts/bytes`) that returns the
   complete audio in a single response — wrapped by NeuroLink's
   `CartesiaTTS` handler so it slots into the same
   `generate({ tts: { provider: "cartesia" } })` flow as OpenAI /
   ElevenLabs / Azure / Fish Audio / Google AI TTS.

This page documents the synchronous handler. For the streaming
WebSocket path, see the voice-agent docs.

### Key Facts

- **Protocol**: Native REST API (`POST /tts/bytes`)
- **Default base URL**: `https://api.cartesia.ai`
- **Default API version**: `2025-04-16` (sent as `Cartesia-Version` header)
- **Default model**: `sonic-2`
- **Default voice**: `694f9389-aac1-45b6-b726-9d9369183238` ("Bright Female", English)
- **Max text length**: 5000 characters
- **Output formats**: `mp3` (default, 44.1 kHz), `wav` (PCM s16le, 44.1 kHz), `pcm16` (raw, 24 kHz)
- **Streaming**: Not via this handler — use `CartesiaStream` for the WebSocket flow

---

## Quick Start

### 1. Get an API Key

Sign up at [play.cartesia.ai](https://play.cartesia.ai/), open
**Manage → API Keys**, click **Create**, give the key a description, and
copy the `sk_car_…` value.

### 2. Configure Environment

```bash
# Required
CARTESIA_API_KEY=sk_car_...

# Optional: override the default voice id (any voice from your Cartesia library)
# CARTESIA_VOICE_ID=...

# Optional: override the model (default is sonic-2)
# CARTESIA_MODEL=sonic-2

# Optional: override the API version header
# CARTESIA_API_VERSION=2025-04-16

# Optional: override the base URL
# CARTESIA_BASE_URL=https://api.cartesia.ai
```

### 3. Synthesize Your First Audio

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync } from "node:fs";

const ai = new NeuroLink();

const result = await ai.generate({
  // The LLM provider doesn't matter — TTS-only flows skip the LLM call
  // when `tts.useAiResponse` is false (default).
  provider: "openai",
  input: { text: "Hello world from Cartesia Sonic" },
  tts: {
    enabled: true,
    provider: "cartesia",
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
  tts: { enabled: true, provider: "cartesia" },
});
```

### Custom Voice

Copy a voice id from the **Voice Library** at
[play.cartesia.ai](https://play.cartesia.ai/voices):

```typescript
const result = await ai.generate({
  provider: "openai",
  input: { text: "..." },
  tts: {
    enabled: true,
    provider: "cartesia",
    voice: "your-cartesia-voice-id",
    format: "mp3",
  },
});
```

### TTS-Augmented LLM Response

When `useAiResponse: true`, NeuroLink first calls the LLM, then
synthesizes the LLM output through Cartesia:

```typescript
const result = await ai.generate({
  provider: "openai", // generates the text
  input: { text: "Tell me a 2-sentence joke" },
  tts: {
    enabled: true,
    provider: "cartesia",
    useAiResponse: true,
    format: "mp3",
  },
});

console.log(result.content); // joke text
writeFileSync("joke.mp3", result.audio.buffer);
```

### WAV / PCM16 Output

```typescript
// WAV (PCM s16le, 44.1 kHz) — complete RIFF/WAV file, plays in any player
const wav = await ai.generate({
  provider: "openai",
  input: { text: "..." },
  tts: { enabled: true, provider: "cartesia", format: "wav" },
});

// PCM16 — raw 16-bit signed-LE PCM @ 24 kHz, NO RIFF header.
// Useful for realtime streaming pipelines that want raw samples.
const pcm = await ai.generate({
  provider: "openai",
  input: { text: "..." },
  tts: { enabled: true, provider: "cartesia", format: "pcm16" },
});
```

### Language Override

The handler defaults to English. Pass `language` via the same options
bag for other supported languages (see Cartesia docs for the current
list):

```typescript
const result = await ai.generate({
  provider: "openai",
  input: { text: "Hola mundo" },
  tts: {
    enabled: true,
    provider: "cartesia",
    // Provider-specific extension; not in TTSOptions yet — passed through.
    language: "es",
  } as unknown as Parameters<typeof ai.generate>[0]["tts"],
});
```

---

## CLI Usage

```bash
# Basic — default voice + mp3
pnpm run cli generate "Hello world" \
  --tts --tts-provider cartesia \
  --output ./hello.mp3

# With a custom voice
pnpm run cli generate "Hello world" \
  --tts --tts-provider cartesia \
  --tts-voice your-cartesia-voice-id \
  --output ./hello.mp3

# WAV format
pnpm run cli generate "Hello world" \
  --tts --tts-provider cartesia \
  --tts-format wav --output ./hello.wav
```

---

## Configuration Reference

| Environment Variable   | Required | Default                                | Description                                                |
| ---------------------- | -------- | -------------------------------------- | ---------------------------------------------------------- |
| `CARTESIA_API_KEY`     | Yes      | —                                      | Cartesia API key (`sk_car_…`)                              |
| `CARTESIA_VOICE_ID`    | No       | `694f9389-aac1-45b6-b726-9d9369183238` | Default voice id used when no `voice` is passed per-call   |
| `CARTESIA_MODEL`       | No       | `sonic-2`                              | Model id sent as `model_id`                                |
| `CARTESIA_API_VERSION` | No       | `2025-04-16`                           | Value of the `Cartesia-Version` request header             |
| `CARTESIA_BASE_URL`    | No       | `https://api.cartesia.ai`              | Base URL (override for self-hosted / EU regional gateways) |

---

## Voice Models

| Model     | Notes                                               |
| --------- | --------------------------------------------------- |
| `sonic-2` | Default — current best balance of latency + quality |
| `sonic`   | Legacy general-purpose voice model                  |

Voices are identified by UUID strings from the Cartesia voice library.
Browse and clone voices in your Cartesia dashboard.

---

## Feature Support Matrix

| Feature                            | Cartesia                                         |
| ---------------------------------- | ------------------------------------------------ |
| Text-to-speech                     | Yes (synchronous)                                |
| Voice cloning                      | Yes (via dashboard upload, then voice id)        |
| Multilingual                       | Yes (English-first; pass `language` to override) |
| MP3 output                         | Yes (44.1 kHz)                                   |
| WAV output                         | Yes (PCM s16le @ 44.1 kHz)                       |
| PCM16 output                       | Yes (24 kHz, raw, no RIFF)                       |
| OPUS output                        | Falls back to MP3                                |
| Synchronous synthesis              | Yes (this handler)                               |
| WebSocket streaming                | Separate — `CartesiaStream` adapter              |
| `getVoices()` programmatic listing | Not implemented (use dashboard)                  |

---

## Troubleshooting

### `CARTESIA_API_KEY not configured`

```bash
echo $CARTESIA_API_KEY
export CARTESIA_API_KEY=sk_car_...
```

Get / rotate at [play.cartesia.ai](https://play.cartesia.ai/keys).

### `Cartesia synthesis failed: 401`

The API key is invalid or revoked. Regenerate from the dashboard and
update your `.env`.

### `Cartesia synthesis failed: 429`

Throttled — usually because the account has insufficient credits or the
plan's per-minute limit is exhausted. Top up credits or implement
client-side backoff. The handler maps 408 / 429 / 5xx to retriable
errors so framework-level retry will honor them.

### Audio sounds wrong / wrong voice

The `voice` field must be a valid Cartesia voice UUID. If it's missing
or invalid, the handler falls back to the env default
(`CARTESIA_VOICE_ID`) or the built-in "Bright Female" id. Browse
[play.cartesia.ai/voices](https://play.cartesia.ai/voices) to find a
voice id, then pass it via `tts.voice` per call or set
`CARTESIA_VOICE_ID` to make it the default.

### PCM16 output is unplayable in audio players

`pcm16` is RAW samples at 24 kHz, not a WAV file — players need a
header. Either write a 44-byte WAV header yourself before the PCM data,
or switch to `format: "wav"` which produces a complete RIFF/WAV file
already.

### Streaming use cases

This handler is synchronous — it waits for the full audio response. For
sub-100 ms first-byte latency in voice-agent flows, use `CartesiaStream`
in `src/lib/adapters/tts/cartesiaHandler.ts` directly (it's wired into
NeuroLink's voice server). The synchronous handler is the right choice
for batch generation, file output, and any flow where you process the
whole audio buffer at once.

---

## See Also

- [TTS Feature Guide](../../features/tts.md) — overall TTS architecture and supported providers
- [Fish Audio TTS](./fish-audio.md) — sibling low-cost TTS handler
- [ElevenLabs TTS](./elevenlabs.md) — sibling TTS with the largest voice library
- [Adding a TTS provider](../../provider-integration/16-adding-tts-provider.md) — internal reference for the integration pattern

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
