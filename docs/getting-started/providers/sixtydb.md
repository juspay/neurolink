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

| Variable                | Required | Purpose                                                          |
| ----------------------- | -------- | ---------------------------------------------------------------- |
| `SIXTYDB_API_KEY`       | Yes      | Workspace API key, sent as a Bearer token                        |
| `SIXTYDB_DEFAULT_VOICE` | No       | Workspace voice UUID used when a request names no voice          |
| `SIXTYDB_BASE_URL`      | No       | API endpoint override (default `https://api.60db.ai`); see below |

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
and a 64 MiB response limit. A `TTSOptions.signal` aborts the request in flight
(headers or body) and rejects with a non-retryable "cancelled" error rather
than waiting for the timeout; `generate()` passes one derived from its own
synthesis timeout and the call's `abortSignal`. The handler makes a single
attempt per synthesis (no retry loop).

Voice filtering compares the primary language subtag, so `en`, `en-US` and the
POSIX-style `en_US` all match a catalog voice labelled `en`.

## CLI

With the workspace key and default voice configured:

```bash
neurolink generate "Say hello in one sentence." --provider openai --tts \
  --tts-provider sixtydb --tts-output hello.wav
```

Use `--tts-voice` to override the default workspace voice for one request.
`--tts-format` defaults to the provider's own format, so with `sixtydb` an
omitted format means WAV; pass `--tts-format pcm16` for raw PCM (saved as
`.pcm` when `--tts-output` has no extension). Any other format is rejected
before the HTTP request. The CLI speaks the model's reply, not the prompt.

## Explicit credentials

For applications that manage credentials themselves, register an instance:

```typescript
import { SixtyDBTTS, TTSProcessor } from "@juspay/neurolink";

TTSProcessor.registerHandler("sixtydb", new SixtyDBTTS(workspaceApiKey));
```

An optional second constructor argument overrides the API endpoint for an
application-managed proxy; `SIXTYDB_BASE_URL` sets the same override for the
auto-registered handler, and so for the CLI. The endpoint must be HTTPS unless
it is a loopback host (`127.0.0.1`, `::1`, `localhost`); an invalid value leaves
the auto-registered handler unregistered. Credentials are sent as a Bearer
token; HTTP redirects are rejected.

## Troubleshooting

- Missing credentials: configure the workspace key before registration.
- Missing voice or invalid UUID: list workspace voices and supply an ID from
  that catalog.
- Unsupported format: only WAV (the default) and PCM16 are accepted, in the
  SDK and the CLI alike; MP3 and the other compressed formats are rejected
  before any request is sent.
- Failed `generate()`: inspect `result.ttsMetadata` and check `result.audio`
  before saving. NeuroLink reports speech failures separately from text output.
- HTTP authentication errors and malformed audio responses are non-retryable.

See the [60db TTS reference](https://docs.60db.ai/api-reference/tts/text-to-speech)
and [workspace voice reference](https://docs.60db.ai/api-reference/voices/get-voices)
for the upstream request contract.
