---
title: Deepgram Provider Guide
description: Transcribe audio to text using Deepgram's Nova speech recognition models through NeuroLink, with streaming, speaker diarization, and smart formatting
keywords: deepgram, stt, speech-to-text, transcription, nova-2, nova-3, diarization, smart formatting, streaming, audio
---

# Deepgram Provider Guide

**Fast, accurate speech-to-text with streaming, speaker diarization, and smart formatting**

---

## Overview

Deepgram is a speech recognition provider optimised for speed and accuracy in production environments. NeuroLink wraps Deepgram's Listen API, giving you access to the Nova-2 and Nova-3 model families through the standard `generate()` call. Deepgram's strengths include real-time streaming transcription over WebSocket, speaker diarization for multi-speaker audio, and smart formatting that cleans up dates, currency, and numbers automatically.

### Key Facts

| Property               | Value                                         |
| ---------------------- | --------------------------------------------- |
| **Provider ID**        | `deepgram`                                    |
| **API endpoint**       | `https://api.deepgram.com/v1/listen`          |
| **Streaming endpoint** | `wss://api.deepgram.com/v1/listen`            |
| **Default model**      | `nova-2`                                      |
| **Formats**            | mp3, wav, ogg, opus                           |
| **Max audio**          | 2 hours (7,200 seconds) per request           |
| **Languages**          | 40+ languages and dialects                    |
| **Streaming**          | Yes (WebSocket-based real-time transcription) |

---

## Quick Start

### 1. Get an API Key

Sign up at [https://console.deepgram.com](https://console.deepgram.com) and create an API key under **Settings → API Keys**.

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required
DEEPGRAM_API_KEY=your-deepgram-api-key

# Optional: default model (default: nova-2)
DEEPGRAM_MODEL=nova-2

# Optional: default language (default: en-US)
DEEPGRAM_LANGUAGE=en-US
```

### 3. Install NeuroLink

```bash
npm install @juspay/neurolink
# or
pnpm add @juspay/neurolink
```

### 4. Transcribe Your First Audio File

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFileSync } from "fs";

const ai = new NeuroLink();
const audioBuffer = readFileSync("./recording.wav");

const result = await ai.generate({
  input: { text: "Transcribe the following audio." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio: audioBuffer,
    format: "wav",
  },
});

if (result.stt) {
  console.log("Transcript:", result.stt.text);
  console.log("Confidence:", result.stt.confidence);
  console.log("Duration:", result.stt.duration, "seconds");
}
```

---

## Supported Models

| Model ID           | Description                                        | Best For                                |
| ------------------ | -------------------------------------------------- | --------------------------------------- |
| `nova-2` (default) | Fastest, lowest Word Error Rate in the Nova family | General transcription, production use   |
| `nova-2-general`   | General-purpose variant, same as `nova-2`          | Broad use cases                         |
| `nova-2-meeting`   | Optimised for multi-speaker meeting audio          | Video conferences, recordings           |
| `nova-2-phonecall` | Tuned for telephone audio quality                  | Call centre, PSTN audio                 |
| `nova-2-voicemail` | Handles background noise and compressed audio      | Voicemail transcription                 |
| `nova-2-finance`   | Finance-domain vocabulary boost                    | Earnings calls, financial content       |
| `nova-2-medical`   | Medical terminology                                | Clinical notes, consultations           |
| `nova-3`           | Next-generation model with improved accuracy       | Demanding accuracy requirements         |
| `nova`             | Previous generation Nova                           | Legacy compatibility                    |
| `enhanced`         | High accuracy, slower processing                   | Archival, quality-critical paths        |
| `base`             | Fastest, lower accuracy                            | Draft transcriptions, cost optimisation |

---

## SDK Usage

### Basic Transcription

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFileSync } from "fs";

const ai = new NeuroLink();
const audio = readFileSync("./meeting.wav");

const result = await ai.generate({
  input: { text: "Transcribe this audio." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
    language: "en-US",
  },
});

if (result.stt) {
  console.log(result.stt.text);
}
```

### Choosing a Model

```typescript
import type { DeepgramSTTOptions } from "@juspay/neurolink";

const result = await ai.generate({
  input: { text: "Transcribe this meeting recording." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
    model: "nova-2-meeting",
  } as DeepgramSTTOptions,
});
```

### Smart Formatting

Smart formatting cleans up numbers, currency, dates, and other structured data automatically:

```typescript
import type { DeepgramSTTOptions } from "@juspay/neurolink";

const result = await ai.generate({
  input: { text: "Transcribe with formatting." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
    smartFormat: true, // Formats "twenty five dollars" → "$25"
  } as DeepgramSTTOptions,
});
```

### Speaker Diarization

Identify who spoke when in multi-speaker audio:

```typescript
const result = await ai.generate({
  input: { text: "Transcribe and identify speakers." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
    speakerDiarization: true,
  },
});

if (result.stt) {
  console.log("Transcript:", result.stt.text);
  console.log("Speakers found:", result.stt.speakers);

  // Word-level speaker attribution
  for (const word of result.stt.words ?? []) {
    console.log(
      `${word.speaker ?? "?"}: "${word.word}" [${word.startTime}s–${word.endTime}s]`,
    );
  }
}
```

### Utterance Segmentation

Split audio into utterance-level segments with speaker and timing information:

```typescript
import type { DeepgramSTTOptions } from "@juspay/neurolink";

const result = await ai.generate({
  input: { text: "Segment into utterances." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
    utterances: true,
    speakerDiarization: true,
  } as DeepgramSTTOptions,
});

if (result.stt?.segments) {
  for (const seg of result.stt.segments) {
    console.log(`[${seg.startTime}s] ${seg.speaker ?? "Speaker"}: ${seg.text}`);
  }
}
```

### Word-Level Timestamps

```typescript
const result = await ai.generate({
  input: { text: "Transcribe with word timings." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
    wordTimestamps: true,
  },
});

if (result.stt?.words) {
  for (const word of result.stt.words) {
    console.log(
      `"${word.word}" at ${word.startTime}s (confidence: ${word.confidence?.toFixed(2)})`,
    );
  }
}
```

### Custom Vocabulary / Keyword Boosting

Improve recognition of domain-specific terms:

```typescript
import type { DeepgramSTTOptions } from "@juspay/neurolink";

const result = await ai.generate({
  input: { text: "Transcribe technical content." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
    keywords: ["NeuroLink", "EulerHS", "Juspay", "HyperSDK"],
    keywordBoost: "high",
  } as DeepgramSTTOptions,
});
```

### Content Redaction

Automatically redact sensitive data from transcripts:

```typescript
import type { DeepgramSTTOptions } from "@juspay/neurolink";

const result = await ai.generate({
  input: { text: "Transcribe and redact PII." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
    redact: ["pci", "ssn"], // Redact credit card and SSN numbers
  } as DeepgramSTTOptions,
});
```

### Real-Time Streaming Transcription

Use the `DeepgramSTT` handler directly for WebSocket-based streaming:

```typescript
import { DeepgramSTT } from "@juspay/neurolink/voice";
import { createReadStream } from "fs";

const handler = new DeepgramSTT(process.env.DEEPGRAM_API_KEY);

async function* readAudioStream(filePath: string): AsyncIterable<Buffer> {
  const stream = createReadStream(filePath, { highWaterMark: 4096 });
  for await (const chunk of stream) {
    yield chunk as Buffer;
  }
}

const audioStream = readAudioStream("./live-audio.wav");

for await (const segment of handler.transcribeStream(audioStream, {
  language: "en-US",
  smartFormat: true,
  speakerDiarization: true,
})) {
  const status = segment.isFinal ? "[FINAL]" : "[partial]";
  console.log(`${status} ${segment.text}`);
}
```

### Per-Call Credential Override

```typescript
const result = await ai.generate({
  input: { text: "Transcribe with a per-request key." },
  stt: {
    enabled: true,
    provider: "deepgram",
    audio,
    format: "wav",
  },
  credentials: {
    deepgram: {
      apiKey: "user-specific-deepgram-key",
    },
  },
});
```

---

## CLI Usage

### Basic Transcription

```bash
# Transcribe an audio file
neurolink generate "Respond to audio" \
  --stt --stt-provider deepgram \
  --input-audio recording.wav

# Specify model
neurolink generate "Transcribe this meeting" \
  --stt --stt-provider deepgram \
  --stt-model nova-2-meeting \
  --input-audio meeting.mp3
```

### Language Selection

```bash
neurolink generate "Transcribe Spanish audio" \
  --stt --stt-provider deepgram \
  --stt-language es \
  --input-audio audio-es.wav
```

### Smart Formatting

```bash
neurolink generate "Transcribe with smart formatting" \
  --stt --stt-provider deepgram \
  --stt-smart-format \
  --input-audio recording.wav
```

### Speaker Diarization

```bash
neurolink generate "Identify speakers" \
  --stt --stt-provider deepgram \
  --stt-diarize \
  --input-audio meeting.wav
```

---

## Supported Languages

Deepgram supports 40+ languages and regional dialects. Key languages available with diarization and punctuation:

| Code    | Language     |
| ------- | ------------ |
| `en`    | English      |
| `en-US` | English (US) |
| `en-GB` | English (UK) |
| `es`    | Spanish      |
| `fr`    | French       |
| `de`    | German       |
| `it`    | Italian      |
| `pt`    | Portuguese   |
| `nl`    | Dutch        |
| `ja`    | Japanese     |
| `ko`    | Korean       |
| `zh`    | Chinese      |
| `hi`    | Hindi        |
| `ru`    | Russian      |

For the full language list, see the [Deepgram language support docs](https://developers.deepgram.com/docs/models-languages-overview).

---

## Configuration Reference

| Environment Variable | Required | Default  | Description                    |
| -------------------- | -------- | -------- | ------------------------------ |
| `DEEPGRAM_API_KEY`   | Yes      | —        | Deepgram API key               |
| `DEEPGRAM_MODEL`     | No       | `nova-2` | Default transcription model    |
| `DEEPGRAM_LANGUAGE`  | No       | `en-US`  | Default transcription language |

---

## Feature Support Matrix

| Feature                | Supported | Notes                                          |
| ---------------------- | --------- | ---------------------------------------------- |
| Batch transcription    | Yes       | Up to 2 hours per request                      |
| Real-time streaming    | Yes       | WebSocket via `transcribeStream()`             |
| Speaker diarization    | Yes       | `speakerDiarization: true`                     |
| Word-level timestamps  | Yes       | Included by default when words are returned    |
| Smart formatting       | Yes       | `smartFormat: true` — numbers, dates, currency |
| Utterance segmentation | Yes       | `utterances: true`                             |
| Keyword boosting       | Yes       | `keywords` + `keywordBoost`                    |
| Content redaction      | Yes       | PCI, SSN number redaction                      |
| Profanity filter       | Yes       | `profanityFilter: true`                        |
| Custom vocabulary      | Yes       | `keywords` array                               |
| Multi-format input     | Yes       | mp3, wav, ogg, opus                            |
| Confidence scores      | Yes       | Per-transcript and per-word                    |
| 40+ languages          | Yes       | `language` option                              |

---

## Troubleshooting

### "deepgram provider not configured"

The `DEEPGRAM_API_KEY` environment variable is missing or not loaded.

```bash
echo $DEEPGRAM_API_KEY

export DEEPGRAM_API_KEY=your-key-here
```

Create or rotate keys at [https://console.deepgram.com](https://console.deepgram.com).

### "HTTP 401" — Invalid API key

Your key is invalid or has been revoked. Generate a new one from the Deepgram console.

### "HTTP 402" — Insufficient credits

Your account balance is exhausted. Top up at [https://console.deepgram.com/billing](https://console.deepgram.com/billing).

### "HTTP 429" — Rate limit exceeded

Too many concurrent requests. Implement exponential backoff or reduce concurrency. Rate limits are documented in the [Deepgram API docs](https://developers.deepgram.com/docs/rate-limits).

### Empty transcript returned

Audio may be silent, below detection threshold, or in the wrong language. Verify:

1. The audio buffer is not empty (`audioBuffer.length > 0`).
2. The `format` matches the actual audio encoding.
3. The `language` matches the audio's spoken language.

### "Deepgram STT request timed out after 30 seconds"

The request took longer than 30 seconds — typically due to very long audio or network issues. For audio over 30 minutes, consider splitting into chunks.

### Streaming WebSocket disconnects

Check that `DEEPGRAM_API_KEY` is valid and that your network allows outbound WebSocket connections to `wss://api.deepgram.com`. Firewall or proxy configurations may block WebSocket upgrades.

### Diarization not appearing in results

Diarization requires multi-speaker audio with clearly separated voices. Single-speaker audio will return no speaker labels. Also confirm `speakerDiarization: true` is set, and that you are using a model that supports it (Nova-2 and above).

---

## See Also

- [Audio Input (STT) Guide](/docs/features/audio-input) — complete multi-provider STT reference
- [Voice Agent Guide](/docs/features/voice-agent) — building full voice assistants
- [OpenAI TTS Provider Guide](/docs/getting-started/providers/openai-tts) — text-to-speech counterpart
- [ElevenLabs Provider Guide](/docs/getting-started/providers/elevenlabs) — alternative TTS with voice cloning

---

**Need Help?** Join the [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
