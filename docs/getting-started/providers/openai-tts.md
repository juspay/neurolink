---
title: OpenAI TTS Provider Guide
description: Generate high-quality speech audio using OpenAI's Text-to-Speech API through NeuroLink, with six neural voices and multiple audio formats
keywords: openai, tts, text-to-speech, audio, speech synthesis, neural voice, tts-1, tts-1-hd
---

# OpenAI TTS Provider Guide

**High-quality neural text-to-speech with six distinct voices and HD quality option**

---

## Overview

NeuroLink integrates OpenAI's Text-to-Speech API, giving you access to six expressive neural voices across two model tiers. The standard model (`tts-1`) optimises for low latency, while the HD model (`tts-1-hd`) delivers higher audio fidelity for production use cases such as podcasts, voice assistants, and narration.

OpenAI TTS works with any NeuroLink text generation call — you can synthesise the raw prompt directly or synthesise the AI-generated response, controlled by the `useAiResponse` flag.

### Key Facts

| Property         | Value                                         |
| ---------------- | --------------------------------------------- |
| **Provider ID**  | `openai-tts`                                  |
| **API endpoint** | `https://api.openai.com/v1/audio/speech`      |
| **Models**       | `tts-1` (standard), `tts-1-hd` (high quality) |
| **Voices**       | alloy, echo, fable, onyx, nova, shimmer       |
| **Formats**      | mp3, wav, ogg (opus), opus                    |
| **Max input**    | 4,096 characters per request                  |
| **Languages**    | Follows input text language automatically     |
| **Streaming**    | Not supported (batch synthesis only)          |

---

## Quick Start

### 1. Get an API Key

Sign up or log in at [https://platform.openai.com](https://platform.openai.com) and create a new secret key under **API keys**.

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional: default model (default: tts-1)
OPENAI_TTS_MODEL=tts-1

# Optional: default voice (default: alloy)
OPENAI_TTS_VOICE=alloy
```

### 3. Install NeuroLink

```bash
npm install @juspay/neurolink
# or
pnpm add @juspay/neurolink
```

### 4. Synthesise Your First Audio

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync } from "fs";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "openai",
  input: { text: "Hello! Welcome to NeuroLink." },
  tts: {
    enabled: true,
    provider: "openai-tts",
    format: "mp3",
  },
});

if (result.tts) {
  writeFileSync("output.mp3", result.tts.buffer);
  console.log(`Saved ${result.tts.size} bytes to output.mp3`);
}
```

---

## Supported Models

| Model ID   | Quality  | Latency | Use Case                                       |
| ---------- | -------- | ------- | ---------------------------------------------- |
| `tts-1`    | Standard | Lower   | Default; real-time apps, interactive voice UIs |
| `tts-1-hd` | HD       | Higher  | Podcasts, narration, production audio assets   |

Select the HD model by passing `quality: "hd"` in TTS options — NeuroLink maps this automatically to `tts-1-hd`.

---

## SDK Usage

### Direct Text Synthesis

Synthesise the input text directly without calling an AI model:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  input: { text: "NeuroLink makes AI development simple." },
  tts: {
    enabled: true,
    provider: "openai-tts",
    voice: "nova",
    format: "mp3",
  },
});

if (result.tts) {
  console.log("Format:", result.tts.format);
  console.log("Size:", result.tts.size, "bytes");
  console.log("Latency:", result.tts.metadata?.latency, "ms");
}
```

### AI Response Synthesis

Generate a response with an AI model and then synthesise it:

```typescript
const result = await ai.generate({
  provider: "openai",
  input: { text: "Greet the user in a warm and friendly tone." },
  tts: {
    enabled: true,
    provider: "openai-tts",
    useAiResponse: true, // Synthesise the AI-generated text, not the prompt
    voice: "shimmer",
    format: "mp3",
  },
});
```

### HD Quality Audio

```typescript
const result = await ai.generate({
  input: { text: "This is high-definition audio narration." },
  tts: {
    enabled: true,
    provider: "openai-tts",
    quality: "hd", // Maps to tts-1-hd
    voice: "onyx",
    format: "wav",
  },
});
```

### Adjusting Playback Speed

```typescript
const result = await ai.generate({
  input: { text: "Speaking at 80% normal speed." },
  tts: {
    enabled: true,
    provider: "openai-tts",
    voice: "alloy",
    speed: 0.8, // Range: 0.25 to 4.0 (default: 1.0)
    format: "mp3",
  },
});
```

### Save to File

```typescript
import { writeFileSync } from "fs";

const result = await ai.generate({
  input: { text: "Saving audio to disk." },
  tts: {
    enabled: true,
    provider: "openai-tts",
    voice: "echo",
    format: "mp3",
    output: "./audio/output.mp3", // NeuroLink saves automatically if set
  },
});
```

### Per-Call Credential Override

```typescript
const result = await ai.generate({
  input: { text: "Hello!" },
  tts: {
    enabled: true,
    provider: "openai-tts",
  },
  credentials: {
    openai: {
      apiKey: "sk-user-specific-key",
    },
  },
});
```

---

## CLI Usage

### Basic TTS

```bash
# Synthesise text directly
neurolink generate "Hello, world!" --tts --tts-provider openai-tts

# Choose a voice
neurolink generate "Good morning!" --tts --tts-provider openai-tts --tts-voice nova

# Save to file
neurolink generate "Save this audio." \
  --tts --tts-provider openai-tts \
  --tts-voice shimmer \
  --tts-output greeting.mp3
```

### HD Quality

```bash
neurolink generate "Professional narration." \
  --tts --tts-provider openai-tts \
  --tts-quality hd \
  --tts-voice onyx \
  --tts-output narration.mp3
```

### Synthesise AI Response

```bash
neurolink generate "Tell me a short story." \
  --provider openai \
  --tts --tts-provider openai-tts \
  --tts-voice fable \
  --tts-use-ai-response
```

### Speed Adjustment

```bash
neurolink generate "Slow and clear narration." \
  --tts --tts-provider openai-tts \
  --tts-voice alloy \
  --tts-speed 0.75
```

---

## Available Voices

| Voice ID  | Gender  | Character                        | Best For                          |
| --------- | ------- | -------------------------------- | --------------------------------- |
| `alloy`   | Neutral | Balanced, clear, versatile       | General purpose, default          |
| `echo`    | Male    | Crisp, authoritative             | Announcements, business content   |
| `fable`   | Neutral | Warm, expressive, storytelling   | Narration, audiobooks             |
| `onyx`    | Male    | Deep, confident, professional    | Voiceovers, documentary           |
| `nova`    | Female  | Bright, friendly, conversational | Voice assistants, customer-facing |
| `shimmer` | Female  | Soft, gentle, calm               | Wellness apps, guided meditation  |

OpenAI voices are language-agnostic — they follow the language of the input text automatically, supporting English, Spanish, French, German, Japanese, and many more.

---

## Audio Formats

| Format | Extension | Use Case                                | Notes                |
| ------ | --------- | --------------------------------------- | -------------------- |
| `mp3`  | `.mp3`    | Default; web, mobile, general storage   | 24 kHz sample rate   |
| `wav`  | `.wav`    | Uncompressed; audio editors, processing | 24 kHz sample rate   |
| `ogg`  | `.ogg`    | Browser streaming, web apps             | Opus codec at 48 kHz |
| `opus` | `.opus`   | Low-bandwidth streaming                 | Opus codec at 48 kHz |

---

## Configuration Reference

| Environment Variable | Required | Default | Description                           |
| -------------------- | -------- | ------- | ------------------------------------- |
| `OPENAI_API_KEY`     | Yes      | —       | OpenAI API key (starts with `sk-`)    |
| `OPENAI_TTS_MODEL`   | No       | `tts-1` | Default model (`tts-1` or `tts-1-hd`) |
| `OPENAI_TTS_VOICE`   | No       | `alloy` | Default voice ID                      |

---

## Feature Support Matrix

| Feature                | Supported | Notes                              |
| ---------------------- | --------- | ---------------------------------- |
| Text synthesis         | Yes       |                                    |
| AI response synthesis  | Yes       | Set `useAiResponse: true`          |
| HD quality             | Yes       | `quality: "hd"` maps to `tts-1-hd` |
| Speed control          | Yes       | 0.25 – 4.0                         |
| Voice selection        | Yes       | 6 neural voices                    |
| Multiple formats       | Yes       | mp3, wav, ogg, opus                |
| Streaming TTS          | No        | Batch synthesis only               |
| Pitch / volume control | No        | Not supported by OpenAI TTS API    |
| Custom voices          | No        | Only built-in voices supported     |

---

## Troubleshooting

### "OpenAI TTS API key not configured"

The `OPENAI_API_KEY` environment variable is missing or was not loaded.

```bash
# Check the variable is set
echo $OPENAI_API_KEY

# Set it for the current session
export OPENAI_API_KEY=sk-...
```

Create or rotate keys at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).

### "HTTP 429" — Rate limit exceeded

You have hit OpenAI's TTS rate limits. Implement exponential backoff or reduce request concurrency. Rate limits are per-key and depend on your usage tier.

### "HTTP 400" — Request too long

The input text exceeds 4,096 characters. Split long content into smaller chunks and synthesise each separately.

```typescript
function chunkText(text: string, maxLen = 4000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}
```

### "OpenAI TTS request timed out after 30 seconds"

A network issue or overloaded API caused the request to time out. Retry the request — the error is marked retriable by NeuroLink's error system.

### Audio sounds distorted at high speed

Speeds above 2.0 can introduce artifacts. Use `speed: 1.0` – `1.5` for natural-sounding output.

---

## See Also

- [TTS Integration Guide](/docs/features/tts) — complete multi-provider TTS reference
- [Audio Input (STT)](/docs/features/audio-input) — speech-to-text counterpart
- [OpenAI Provider Guide](/docs/getting-started/providers/openai) — full OpenAI text generation provider
- [ElevenLabs Provider Guide](/docs/getting-started/providers/elevenlabs) — alternative TTS provider with voice cloning

---

**Need Help?** Join the [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
