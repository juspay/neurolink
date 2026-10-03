---
title: 60db TTS Provider Guide
description: Configure workspace voices and WAV or PCM speech output with 60db.
keywords: sixtydb, 60db, tts, text-to-speech
---

# 60db TTS Provider Guide

60db is a hosted speech API with workspace-scoped voices. NeuroLink exposes
its HTTP text-to-speech endpoint as `sixtydb`.

## Configuration

Set `SIXTYDB_API_KEY` to your workspace API key. Supply a workspace voice UUID
through `tts.voice`, or set `SIXTYDB_DEFAULT_VOICE`. There is no shared default
voice. Existing LLM configuration still applies when using `NeuroLink.generate()`.

```typescript
import {
  NeuroLink,
  TTSProcessor,
  registerDefaultTTSHandlers,
} from "@juspay/neurolink";
import { writeFileSync } from "node:fs";

registerDefaultTTSHandlers();
const voices = await TTSProcessor.getVoices("sixtydb");
if (!voices.length) throw new Error("No voices available in this workspace");

const sdk = new NeuroLink();
const result = await sdk.generate({
  provider: "openai",
  input: { text: "Hello world." },
  tts: {
    enabled: true,
    provider: "sixtydb",
    voice: voices[0].id,
    format: "wav",
  },
});
if (!result.audio) throw new Error("Speech synthesis failed");
writeFileSync("hello.wav", result.audio.buffer);
```

This synthesizes the input directly. Set `tts.useAiResponse: true` to synthesize
the LLM response instead.

## Voice discovery

`TTSProcessor.getVoices("sixtydb")` loads the workspace's quality and fast
catalogs and caches their combined results for five minutes. Pass
`{ languageCode: "hi" }` as the second argument to filter using the catalog's
language labels. The selected voice determines the synthesis tier; no model ID
is sent in the synthesis request.

## Audio and options

| Option     | Supported values                |
| ---------- | ------------------------------- |
| `voice`    | Workspace voice UUID            |
| `format`   | `wav` (default), `pcm16`        |
| `speed`    | 0.5–2; default 1                |
| Input text | 1–5000 characters per synthesis |

The handler requests mono LINEAR16 audio at 24 kHz. WAV output includes a RIFF
header; `pcm16` is raw signed 16-bit little-endian audio. Other formats are
rejected before the HTTP request. Native timestamp, pitch and volume controls
are not exposed by this handler.

The handler buffers each HTTP synthesis response. `stream()` uses NeuroLink's
existing sentence-based TTS processing; it does not expose 60db's native audio
stream. Each request has a 30-second timeout covering headers and response body,
and a 64 MiB response limit.

## CLI

With the workspace key and default voice configured:

```bash
neurolink generate "Hello world." --provider openai --tts \
  --tts-provider sixtydb --tts-format wav --tts-output hello.wav
```

Use `--tts-voice` to override the default workspace voice for one request.

## Explicit credentials

For applications that manage credentials themselves, register an instance:

```typescript
import { SixtyDBTTS, TTSProcessor } from "@juspay/neurolink";

TTSProcessor.registerHandler("sixtydb", new SixtyDBTTS(workspaceApiKey));
```

An optional second constructor argument overrides the API endpoint for an
application-managed proxy. Credentials are sent as a Bearer token; HTTP
redirects are rejected.

## Troubleshooting

- Missing credentials: configure the workspace key before registration.
- Missing voice or invalid UUID: list workspace voices and supply an ID from
  that catalog.
- Unsupported format: select WAV or PCM16 explicitly, especially in the CLI,
  whose common format default is MP3.
- Failed `generate()`: inspect `result.ttsMetadata` and check `result.audio`
  before saving. NeuroLink reports speech failures separately from text output.
- HTTP authentication errors and malformed audio responses are non-retryable.

See the [60db TTS reference](https://docs.60db.ai/api-reference/tts/text-to-speech)
and [workspace voice reference](https://docs.60db.ai/api-reference/voices/get-voices)
for the upstream request contract.
