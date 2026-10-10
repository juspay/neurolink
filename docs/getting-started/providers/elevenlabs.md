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

| Property          | Value                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **Provider ID**   | `elevenlabs`                                                             |
| **API endpoint**  | `https://api.elevenlabs.io/v1`                                           |
| **Default model** | `eleven_multilingual_v2`                                                 |
| **Default voice** | Rachel (`21m00Tcm4TlvDq8ikWAM`)                                          |
| **Formats**       | mp3 (44.1 kHz), wav (raw PCM 44.1 kHz), ogg/opus (Opus 48 kHz)           |
| **Max input**     | 5,000 characters per request                                             |
| **Languages**     | 29+ languages per voice (auto-detected from input)                       |
| **Streaming**     | Not supported in NeuroLink integration (batch only)                      |
| **STT**           | `elevenlabs-stt` (Scribe) — see [Speech-to-Text](#speech-to-text-scribe) |

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

if (result.audio) {
  writeFileSync("output.mp3", result.audio.buffer);
  console.log(`Saved ${result.audio.size} bytes to output.mp3`);
}
```

---

## Supported Models

| Model ID                 | Description                                               | Use Case                          |
| ------------------------ | --------------------------------------------------------- | --------------------------------- |
| `eleven_multilingual_v2` | Default; 29 languages, highest quality                    | General use, multilingual content |
| `eleven_v3`              | Most expressive; 70+ languages, accepts `language`        | Narration, dialogue               |
| `eleven_flash_v2_5`      | Lowest latency (~75 ms), 32 languages, accepts `language` | Real-time, conversational agents  |
| `eleven_flash_v2`        | Lowest latency, English only                              | Real-time English                 |
| `eleven_turbo_v2_5`      | Fast, 32 languages, accepts `language`                    | Low-latency multilingual          |
| `eleven_turbo_v2`        | Fast, lower latency variant, English                      | Real-time applications            |
| `eleven_monolingual_v1`  | English-only, optimised for English naturalness           | English-only apps                 |

Pass the model ID explicitly via the `ElevenLabsTTSOptions.model` field or let the integration default to `eleven_multilingual_v2`.

**Language pinning.** Set `tts.language` (generic) or `tts.languageCode`
(ElevenLabs-specific) to pin the language; a BCP-47 tag such as `en-US` is
reduced to `en`. The code is sent on every model except
`eleven_multilingual_v2`, the one model the API rejects it on — there it is
logged and dropped, and the model auto-detects the language from the text.
Models that do not use the field (`eleven_flash_v2`, `eleven_turbo_v2`,
`eleven_monolingual_v1`) ignore it server-side rather than failing.

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

if (result.audio) {
  console.log("Format:", result.audio.format);
  console.log("Size:", result.audio.size, "bytes");
  console.log("Provider:", result.audio.metadata?.provider);
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
    mode: "response", // Synthesise the AI-generated text, not the prompt
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
    speed: 1.1, // 0.7–1.2 on ElevenLabs; values outside are clamped with a warning
    voiceSettings: { stability: 0.7 }, // raw voice_settings passthrough; wins on conflict
  } as ElevenLabsTTSOptions,
});
```

`speed` is the generic `TTSOptions.speed` (0.25–4.0). ElevenLabs accepts only
0.7–1.2, so out-of-range values are clamped into that band — with a
`logger.warn` — rather than rejected.

### Bitrates, timeouts and retries

```typescript
tts: {
  enabled: true,
  provider: "elevenlabs",
  format: "ogg",       // → opus_48000_<kbps>
  opusBitrate: 96,     // 32 | 64 | 96 | 128 | 192 (default 64)
  mp3Bitrate: 192,     // 32 | 64 | 96 | 128 | 192 (default 128), used when format is mp3
  timeoutMs: 20_000,   // per attempt (default 30 000)
  retries: 2,          // after the first attempt (default 1)
  baseUrl: "https://api.elevenlabs.io/v1", // override, e.g. a proxy
} as ElevenLabsTTSOptions
```

A request is retried on `429`, any `5xx`, a per-attempt timeout or a
transport error (a refused or reset connection, a DNS failure), honouring
`Retry-After` when the response carries one (capped at 10 s) and backing off
exponentially from 500 ms otherwise. A `4xx` other than `429` fails
immediately and is marked non-retriable, as does anything thrown before a
request exists (a malformed `baseUrl`). `generate()`'s own synthesis timeout
is raised to at least `timeoutMs × (1 + retries)` plus pause slack — using
the defaults above (30 s, one retry) for any knob you leave unset — so the
handler's retry loop is never cut short from outside, including on a default
call. To stop early, pass an `abortSignal` to `generate()` (or `signal` on the
TTS options when calling the handler directly): the attempt in flight is
aborted and no further attempt is made. `timeoutMs` is capped at 2³¹−1 ms,
the largest delay a timer honours. An `mp3Bitrate` / `opusBitrate` outside
the listed values falls back to the default with a warning rather than being
sent.

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

The CLI always speaks the model's reply, so no extra flag is needed:

```bash
neurolink generate "Write a product tagline for a fintech app." \
  --provider openai \
  --tts --tts-provider elevenlabs \
  --tts-output tagline.mp3
```

To speak a fixed text verbatim instead, use the SDK with `tts.mode: "direct"`.

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

try {
  const handler = new ElevenLabsTTS(process.env.ELEVENLABS_API_KEY);
  const voices = await handler.getVoices();

  for (const voice of voices) {
    console.log(`${voice.id} — ${voice.name} (${voice.gender})`);
  }
} catch (error) {
  console.error(
    "Failed to fetch voices:",
    error instanceof Error ? error.message : String(error),
  );
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

| Format | Extension | ElevenLabs `output_format`       | Sample Rate | `audio.format` |
| ------ | --------- | -------------------------------- | ----------- | -------------- |
| `mp3`  | `.mp3`    | `mp3_44100_<mp3Bitrate>` (128)   | 44,100 Hz   | `mp3`          |
| `wav`  | `.wav`    | `pcm_44100` — raw PCM, no header | 44,100 Hz   | `pcm16`        |
| `ogg`  | `.ogg`    | `opus_48000_<opusBitrate>` (64)  | 48,000 Hz   | `opus`         |
| `opus` | `.opus`   | `opus_48000_<opusBitrate>` (64)  | 48,000 Hz   | `opus`         |

ElevenLabs has no `ogg_*` output family — Ogg/Opus is `opus_48000_<kbps>`.
Earlier NeuroLink releases sent `ogg_22050` for `ogg`/`opus`, which the API
rejects with a 422; that is fixed. The returned Ogg container starts with the
`OggS` page marker and an `OpusHead` packet. `wav` output is **headerless**
PCM (reported as `pcm16`): wrap it with `createWavFile()` from
`@juspay/neurolink/voice` before writing a `.wav` file, and pass the sample
rate — `createWavFile` defaults to 16 kHz, while ElevenLabs PCM is 44.1 kHz,
so a header written with the default plays 2.76× slow and low:

```typescript
import { writeFileSync } from "node:fs";
import { createWavFile } from "@juspay/neurolink/voice";

const result = await ai.generate({
  input: { text: "Raw PCM, wrapped as WAV." },
  tts: { enabled: true, provider: "elevenlabs", format: "wav" },
});
if (result.audio) {
  writeFileSync(
    "out.wav",
    createWavFile(result.audio.buffer, result.audio.sampleRate), // 44100
  );
}
```

---

## Configuration Reference

| Environment Variable  | Required | Default                        | Description                                     |
| --------------------- | -------- | ------------------------------ | ----------------------------------------------- |
| `ELEVENLABS_API_KEY`  | Yes      | —                              | ElevenLabs API key (shared by TTS, STT, music)  |
| `ELEVENLABS_BASE_URL` | No       | `https://api.elevenlabs.io/v1` | API base URL including `/v1` (proxies, tests)   |
| `ELEVENLABS_VOICE_ID` | No       | `21m00Tcm4TlvDq8ikWAM`         | Default voice (Rachel); a per-call `voice` wins |
| `ELEVENLABS_MODEL`    | No       | `eleven_multilingual_v2`       | Default TTS model; a per-call `model` wins      |

---

## Feature Support Matrix

| Feature                | Supported | Notes                                                               |
| ---------------------- | --------- | ------------------------------------------------------------------- |
| Text synthesis         | Yes       |                                                                     |
| AI response synthesis  | Yes       | Set `mode: "response"`                                              |
| Multilingual support   | Yes       | 29 languages, auto-detected                                         |
| Language pinning       | Yes       | `language` (ISO 639-1; `en-US` → `en`) on all but `multilingual_v2` |
| Voice discovery        | Yes       | Dynamic API fetch, 5-minute cache                                   |
| Custom / cloned voices | Yes       | Pass voice ID from your ElevenLabs account                          |
| Voice stability tuning | Yes       | `stability`, `similarityBoost`, `style`, `voiceSettings`            |
| Multiple formats       | Yes       | mp3 (bitrate), raw pcm, opus 48 kHz (bitrate)                       |
| Streaming TTS          | No        | Batch synthesis only in NeuroLink                                   |
| Speed control          | Yes       | `speed`, clamped to 0.7–1.2                                         |
| Retries                | Yes       | `retries` (default 1) on 429/5xx/timeout, honours `Retry-After`     |
| Speech-to-text         | Yes       | `elevenlabs-stt` (Scribe), aliases `scribe`, `elevenlabs`           |

---

## Speech-to-Text (Scribe)

The same key also unlocks ElevenLabs Scribe for batch transcription. The STT
handler is registered as `elevenlabs-stt`, with `scribe` and `elevenlabs` as
aliases — the STT and TTS registries are separate, so
`stt: { provider: "elevenlabs" }` and `tts: { provider: "elevenlabs" }`
resolve to different handlers.

```typescript
import { readFileSync } from "node:fs";
import type { ElevenLabsSTTOptions } from "@juspay/neurolink";

const result = await ai.generate({
  input: { text: "Summarise what was said." },
  stt: {
    enabled: true,
    audio: readFileSync("./meeting.mp3"),
    provider: "elevenlabs", // or "elevenlabs-stt" / "scribe"
    format: "mp3",
    speakerDiarization: true, // → diarize=true
    speakerCount: 2, // → num_speakers=2
    // language: "en",        // → language_code; omit to auto-detect
    // model: "scribe_v2_medical", // default scribe_v2
    // tagAudioEvents: true,  // "(laughter)" etc. — NeuroLink sends false by default
  } as ElevenLabsSTTOptions & { audio: Buffer },
});

result.transcription?.text; // full transcript
result.transcription?.words; // [{ word, startTime, endTime, speaker }]
result.transcription?.speakers; // ["speaker_0", "speaker_1"]
result.transcription?.language; // "eng"
```

Request shape: `POST {baseUrl}/speech-to-text`, header `xi-api-key`,
multipart fields `file`, `model_id` (default `scribe_v2`; `scribe_v1` is
deprecated by ElevenLabs and any newer id can be passed as a string),
`language_code` (only when you set `language`; a BCP-47 tag like `en-US` is
reduced to `en`), `tag_audio_events` (`false` unless `tagAudioEvents: true`),
`diarize`, `num_speakers`. Spacing and audio-event entries in Scribe's
`words[]` are dropped from `transcription.words`; `speaker_id` becomes
`speaker`. `transcription.confidence` is the mean per-word `exp(logprob)`
over the spoken words when Scribe reports one; when no word carries a
`logprob` it falls back to `language_probability`, and to `0` when that is
missing too. `transcription.metadata.confidenceSource` says which it was —
`"word_logprobs"`, `"language_probability"` or `"none"` — because Scribe's
`language_probability` measures how sure it is of the _language_, not the
words (garbled and clean audio both score ~0.99), and it is always exposed
under its own name as `transcription.metadata.languageProbability`. `timeoutMs` (default 60 000, covering the response body as
well as the headers) and `baseUrl` are accepted on the same options. Scribe
is batch-only: `supportsStreaming` is `false` and there is no
`transcribeStream`.

CLI (`--stt` is a flag; the file goes in `--input-audio`):

```bash
neurolink generate "Summarise" --stt --stt-provider elevenlabs-stt --input-audio ./meeting.mp3
```

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

### "ElevenLabs TTS request timed out after 30000ms"

A slow network or high server load caused one attempt to time out. The
handler already retries once by default (`retries`); raise `timeoutMs` for
very long inputs, or `retries` for a flaky network.

### "HTTP 422" on `format: "ogg"` / `"opus"`

Fixed: earlier releases asked ElevenLabs for `ogg_22050`, which is not one of
its output formats. `ogg`/`opus` now request `opus_48000_<opusBitrate>`.

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
