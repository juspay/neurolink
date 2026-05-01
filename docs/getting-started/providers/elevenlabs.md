---
title: ElevenLabs Provider Guide
description: Generate studio-quality multilingual speech using ElevenLabs' neural TTS through NeuroLink, with dynamic voice discovery and voice cloning support
keywords: elevenlabs, tts, text-to-speech, audio, multilingual, voice cloning, eleven_multilingual_v2, neural speech
---

# ElevenLabs Provider Guide

**Studio-quality, multilingual text-to-speech with dynamic voice discovery and voice cloning**

---

## Overview

ElevenLabs is a specialist voice AI provider known for exceptionally natural-sounding speech synthesis and extensive multilingual support. NeuroLink integrates their TTS API, giving you access to their full voice library — including custom and cloned voices — through the same `generate()` call used for all other TTS providers.

The default model, `eleven_multilingual_v2`, produces high-fidelity audio across 29 languages with a single voice. ElevenLabs voices are dynamically fetched from the API and cached for five minutes, so newly added or cloned voices are always available without restarting your application.

### Key Facts

| Property          | Value                                               |
| ----------------- | --------------------------------------------------- |
| **Provider ID**   | `elevenlabs`                                        |
| **API endpoint**  | `https://api.elevenlabs.io/v1`                      |
| **Default model** | `eleven_multilingual_v2`                            |
| **Default voice** | Rachel (`21m00Tcm4TlvDq8ikWAM`)                     |
| **Formats**       | mp3 (44.1 kHz), wav (PCM 44.1 kHz), ogg (22 kHz)    |
| **Max input**     | 5,000 characters per request                        |
| **Languages**     | 29+ languages per voice (auto-detected from input)  |
| **Streaming**     | Not supported in NeuroLink integration (batch only) |

---

## Quick Start

### 1. Get an API Key

Sign up at [https://elevenlabs.io](https://elevenlabs.io) and copy your API key from **Profile → API Key**.

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required
ELEVENLABS_API_KEY=your-api-key-here

# Optional: default voice ID (default: Rachel — 21m00Tcm4TlvDq8ikWAM)
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Optional: default model (default: eleven_multilingual_v2)
ELEVENLABS_MODEL=eleven_multilingual_v2
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
  input: { text: "Hello! This is ElevenLabs speaking through NeuroLink." },
  tts: {
    enabled: true,
    provider: "elevenlabs",
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

| Model ID                 | Description                                      | Use Case                          |
| ------------------------ | ------------------------------------------------ | --------------------------------- |
| `eleven_multilingual_v2` | Default; 29 languages, highest quality           | General use, multilingual content |
| `eleven_monolingual_v1`  | English-only, optimised for English naturalness  | English-only apps                 |
| `eleven_multilingual_v1` | First-generation multilingual (superseded by v2) | Legacy compatibility              |
| `eleven_turbo_v2`        | Fast, lower latency variant                      | Real-time applications            |

Pass the model ID explicitly via the `ElevenLabsTTSOptions.model` field or let the integration default to `eleven_multilingual_v2`.

---

## SDK Usage

### Direct Text Synthesis

Synthesise the input text without calling an AI model:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  input: {
    text: "ElevenLabs produces natural-sounding speech in 29 languages.",
  },
  tts: {
    enabled: true,
    provider: "elevenlabs",
    format: "mp3",
  },
});

if (result.tts) {
  console.log("Format:", result.tts.format);
  console.log("Size:", result.tts.size, "bytes");
  console.log("Provider:", result.tts.metadata?.provider);
}
```

### Specifying a Voice

Voices are identified by their `voice_id` string. Use a known ID directly, or list available voices programmatically (see [Voice Discovery](#voice-discovery)):

```typescript
const result = await ai.generate({
  input: { text: "A specific voice selected by ID." },
  tts: {
    enabled: true,
    provider: "elevenlabs",
    voice: "21m00Tcm4TlvDq8ikWAM", // Rachel — the default
    format: "mp3",
  },
});
```

### AI Response Synthesis

Generate a response with an AI model and then synthesise it:

```typescript
const result = await ai.generate({
  provider: "openai",
  input: { text: "Explain quantum computing in two sentences." },
  tts: {
    enabled: true,
    provider: "elevenlabs",
    useAiResponse: true, // Synthesise the AI-generated text, not the prompt
    voice: "21m00Tcm4TlvDq8ikWAM",
    format: "mp3",
  },
});
```

### Multilingual Synthesis

ElevenLabs detects the language of your input automatically. No extra configuration is needed:

```typescript
// Spanish
await ai.generate({
  input: { text: "Buenos días. ¿Cómo puedo ayudarte hoy?" },
  tts: { enabled: true, provider: "elevenlabs", format: "mp3" },
});

// French
await ai.generate({
  input: { text: "Bonjour! Comment puis-je vous aider?" },
  tts: { enabled: true, provider: "elevenlabs", format: "mp3" },
});

// Hindi
await ai.generate({
  input: { text: "नमस्ते! मैं आपकी कैसे सहायता कर सकता हूँ?" },
  tts: { enabled: true, provider: "elevenlabs", format: "mp3" },
});
```

### Voice Settings Tuning

Fine-tune the voice character using ElevenLabs-specific options:

```typescript
import type { ElevenLabsTTSOptions } from "@juspay/neurolink";

const result = await ai.generate({
  input: { text: "Fine-tuned voice output." },
  tts: {
    enabled: true,
    provider: "elevenlabs",
    voice: "21m00Tcm4TlvDq8ikWAM",
    format: "mp3",
    // ElevenLabs-specific settings (cast required for typed access)
    stability: 0.6, // 0–1: higher = more consistent, lower = more expressive
    similarityBoost: 0.8, // 0–1: how closely to match the original voice
    style: 0.2, // 0–1: style exaggeration (v2 models only)
    useSpeakerBoost: true, // Boost speaker clarity
  } as ElevenLabsTTSOptions,
});
```

### Save to File

```typescript
const result = await ai.generate({
  input: { text: "Saving ElevenLabs audio to disk." },
  tts: {
    enabled: true,
    provider: "elevenlabs",
    voice: "21m00Tcm4TlvDq8ikWAM",
    format: "mp3",
    output: "./audio/output.mp3", // NeuroLink saves automatically if set
  },
});
```

### Per-Call Credential Override

```typescript
const result = await ai.generate({
  input: { text: "Using a per-request API key." },
  tts: {
    enabled: true,
    provider: "elevenlabs",
  },
  credentials: {
    elevenlabs: {
      apiKey: "user-specific-elevenlabs-key",
    },
  },
});
```

---

## CLI Usage

### Basic TTS

```bash
# Synthesise text using ElevenLabs
neurolink generate "Hello from ElevenLabs!" --tts --tts-provider elevenlabs

# Save to file
neurolink generate "Saving to disk." \
  --tts --tts-provider elevenlabs \
  --tts-output output.mp3
```

### Choose a Voice

```bash
neurolink generate "Custom voice ID." \
  --tts --tts-provider elevenlabs \
  --tts-voice 21m00Tcm4TlvDq8ikWAM
```

### Synthesise AI Response

```bash
neurolink generate "Write a product tagline for a fintech app." \
  --provider openai \
  --tts --tts-provider elevenlabs \
  --tts-use-ai-response \
  --tts-output tagline.mp3
```

### Multilingual

```bash
neurolink generate "Bonjour! Comment puis-je vous aider?" \
  --tts --tts-provider elevenlabs \
  --tts-output french.mp3
```

---

## Voice Discovery

ElevenLabs voices are fetched dynamically from your account. The result includes both the ElevenLabs library voices and any custom or cloned voices in your account.

```typescript
import { ElevenLabsTTS } from "@juspay/neurolink/voice";

const handler = new ElevenLabsTTS(process.env.ELEVENLABS_API_KEY);
const voices = await handler.getVoices();

for (const voice of voices) {
  console.log(`${voice.id} — ${voice.name} (${voice.gender})`);
}
```

Voices are cached for **5 minutes** per handler instance to avoid redundant API calls.

---

## Supported Languages

`eleven_multilingual_v2` supports 29 languages. The following are recognised by the NeuroLink voice metadata:

| Code | Language   |
| ---- | ---------- |
| `en` | English    |
| `es` | Spanish    |
| `fr` | French     |
| `de` | German     |
| `it` | Italian    |
| `pt` | Portuguese |
| `pl` | Polish     |
| `hi` | Hindi      |
| `ar` | Arabic     |
| `zh` | Chinese    |
| `ja` | Japanese   |
| `ko` | Korean     |

For the full language list, refer to the [ElevenLabs documentation](https://elevenlabs.io/docs/api-reference/how-to-use-tts-with-streaming).

---

## Audio Formats

| Format | Extension | ElevenLabs internal format | Sample Rate |
| ------ | --------- | -------------------------- | ----------- |
| `mp3`  | `.mp3`    | `mp3_44100_128`            | 44,100 Hz   |
| `wav`  | `.wav`    | `pcm_44100`                | 44,100 Hz   |
| `ogg`  | `.ogg`    | `ogg_22050`                | 22,050 Hz   |
| `opus` | `.opus`   | `ogg_22050`                | 22,050 Hz   |

---

## Configuration Reference

| Environment Variable  | Required | Default                  | Description            |
| --------------------- | -------- | ------------------------ | ---------------------- |
| `ELEVENLABS_API_KEY`  | Yes      | —                        | ElevenLabs API key     |
| `ELEVENLABS_VOICE_ID` | No       | `21m00Tcm4TlvDq8ikWAM`   | Default voice (Rachel) |
| `ELEVENLABS_MODEL`    | No       | `eleven_multilingual_v2` | Default TTS model      |

---

## Feature Support Matrix

| Feature                | Supported | Notes                                      |
| ---------------------- | --------- | ------------------------------------------ |
| Text synthesis         | Yes       |                                            |
| AI response synthesis  | Yes       | Set `useAiResponse: true`                  |
| Multilingual support   | Yes       | 29 languages, auto-detected                |
| Voice discovery        | Yes       | Dynamic API fetch, 5-minute cache          |
| Custom / cloned voices | Yes       | Pass voice ID from your ElevenLabs account |
| Voice stability tuning | Yes       | `stability`, `similarityBoost`, `style`    |
| Multiple formats       | Yes       | mp3, wav, ogg, opus                        |
| Streaming TTS          | No        | Batch synthesis only in NeuroLink          |
| Speed control          | No        | Not supported by this integration          |

---

## Troubleshooting

### "ElevenLabs API key not configured"

The `ELEVENLABS_API_KEY` environment variable is missing or was not loaded.

```bash
echo $ELEVENLABS_API_KEY

export ELEVENLABS_API_KEY=your-key-here
```

Retrieve your key from [https://elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys).

### "HTTP 401" — Unauthorised

Your API key is invalid or has been revoked. Generate a new key from the ElevenLabs dashboard.

### "HTTP 429" — Rate limit or quota exceeded

You have reached your character quota for the billing period, or exceeded the per-minute request rate. Check your usage at [https://elevenlabs.io/app/subscription](https://elevenlabs.io/app/subscription).

### "HTTP 400" — Request too long

The input text exceeds 5,000 characters. Split the content into chunks:

```typescript
function chunkText(text: string, maxLen = 4500): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}
```

### "ElevenLabs TTS request timed out after 30 seconds"

A slow network or high server load caused the request to time out. This error is marked retriable — retry with backoff.

### Voice not found

You passed a `voice` ID that does not exist in your account. List available voices to confirm:

```typescript
const handler = new ElevenLabsTTS();
const voices = await handler.getVoices();
console.log(voices.map((v) => `${v.id}: ${v.name}`).join("\n"));
```

### "Failed to get voices"

Voice discovery failed (network error or invalid key). The 5-minute cache shields against transient failures, but a hard failure at startup will propagate. Ensure `ELEVENLABS_API_KEY` is valid and the ElevenLabs API is reachable.

---

## See Also

- [TTS Integration Guide](/docs/features/tts) — complete multi-provider TTS reference
- [OpenAI TTS Provider Guide](/docs/getting-started/providers/openai-tts) — alternative TTS provider
- [Audio Input (STT)](/docs/features/audio-input) — speech-to-text counterpart
- [Voice Agent Guide](/docs/features/voice-agent) — building full voice assistants

---

**Need Help?** Join the [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
