---
title: Whistle (Built-in Local STT)
description: NeuroLink's zero-config, on-device speech-to-text engine — a 17 MB model running in WebAssembly, downloaded once, no API key
keywords: whistle, stt, speech-to-text, local, on-device, offline, wasm, cactus, needle, transcription
---

# Whistle — Built-in Local Speech-to-Text

**Speech-to-text with no API key, no server and no native addon.**

---

## Overview

Whistle is the speech-to-text engine NeuroLink ships with. It runs Cactus's
Whistle model (17 MB) on the Cactus "needle" engine, an Emscripten
WebAssembly build, inside a Node.js worker thread on your own machine. Audio
never leaves the process.

It is the **default STT provider when no other one is configured**:
`transcribe()` uses `NEUROLINK_STT_PROVIDER` if set, then the first
configured cloud or self-hosted provider, and falls back to Whistle, which
needs no credentials.

### Key facts

|                 |                                                          |
| --------------- | -------------------------------------------------------- |
| Provider name   | `whistle`                                                |
| Size on disk    | ~17.9 MB (engine 1 MB + model 16.9 MB)                   |
| Credentials     | none                                                     |
| Languages       | English, German, French, Spanish, Italian, Dutch, Polish |
| Streaming       | native (the engine's own streaming decoder)              |
| Word timestamps | yes, with a per-word probability                         |
| Diarization     | no                                                       |
| Speed           | ~0.5 s of CPU per 10 s of audio on one laptop core       |
| Licence         | engine and model are Apache-2.0                          |

---

## First use

The first transcription downloads three files from pinned Hugging Face
revisions, checks each against a SHA-256, and writes it atomically (temporary
file, then rename), so an interrupted download never leaves a file that looks
complete. Concurrent first calls share one download. Every later call reads
the files from disk, and Whistle works fully offline from then on.

| File           | Source                                                     |
| -------------- | ---------------------------------------------------------- |
| `needle.js`    | `Cactus-Compute/needle3` @ `2ae11323…`, `wasm/needle.js`   |
| `needle.wasm`  | `Cactus-Compute/needle3` @ `2ae11323…`, `wasm/needle.wasm` |
| `whistle.cact` | `Cactus-Compute/whistle` @ `b358ddad…`, `whistle.cact`     |

To warm up ahead of the first request (download, verify, start the worker):

```typescript
import { WhistleSTT } from "@juspay/neurolink";

await new WhistleSTT().warmUp();
```

### Where the files live

The first of these that is set wins:

1. `credentials.stt.whistle.modelDir`
2. `NEUROLINK_WHISTLE_DIR`
3. `$NEUROLINK_MODEL_DIR/whistle`
4. `~/.neurolink/models/whistle`

### Air-gapped machines

Set `NEUROLINK_WHISTLE_AUTO_DOWNLOAD=0` (or
`credentials.stt.whistle.autoDownload: false`) to forbid the download. If a
file is then missing, or does not match its hash, the call fails with an
error that lists each of the three files, the exact path it must be placed
at, and the URL to fetch it from. The same error is raised when the download
is allowed but fails (offline, proxy, HTTP error).

---

## Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFile } from "node:fs/promises";

const neurolink = new NeuroLink();

const result = await neurolink.transcribe({
  audio: await readFile("meeting.wav"),
  provider: "whistle", // optional when no other STT provider is configured
  language: "en", // or "auto" / omitted to detect
  wordTimestamps: true,
});

console.log(result.text);
console.log(result.words?.[0]); // { word, start, end, confidence }
```

### Options

| Option           | Effect                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `language`       | `en de fr es it nl pl`, or a locale (`"de-DE"`). `"auto"`, omitted, or any other language lets the engine detect one of the seven. |
| `wordTimestamps` | Return `words[]` with `start`/`end` (seconds) and `confidence`.                                                                    |
| `vocabulary`     | Keyword biasing for names and jargon — **only** when `model: "whistle-keywords"` or `NEUROLINK_WHISTLE_KEYWORDS=1`. See below.     |
| `format`         | Container hint for a buffer. WAV is recognised from its header whatever this says; `pcm16` means raw PCM16LE mono at `sampleRate`. |
| `sampleRate`     | Rate of `pcm16` input and of streamed frames. Default 16000.                                                                       |

### Result

- `text`, `language` (detected or requested), `duration` (seconds)
- `confidence` — the mean per-word probability (`metadata.confidenceSource:
"word_logprobs"`); 0 for empty text
- `words` — when `wordTimestamps` is set
- `metadata` — `provider: "whistle"`, `model: "whistle"`, `latency` (ms),
  `ttftMs`, `decodeTps`, `chunks` (how many ≤30 s passes the audio took)

### Keyword biasing

The engine can favour given words and phrases, which helps with names and
product terms. It is **opt-in** because the decoder can loop (repeat a
phrase) when given a long list: enable it per call with
`model: "whistle-keywords"`, or globally with `NEUROLINK_WHISTLE_KEYWORDS=1`.
At most 32 entries are sent; keep the list short and specific. For larger
dictionaries, use the dictionary/correction layer of `transcribe()` instead,
which repairs the transcript after the fact.

---

## Long audio

The engine reads at most 30 s per call. Longer audio is cut at the quietest
20 ms frame near every 24 s mark (searching ±3 s), each piece is
transcribed in turn, and word times are shifted back onto the whole
recording. Once a language is detected in the first piece it is held for the
rest. One request may be up to one hour long.

---

## Streaming

Whistle streams natively. `transcribeStream()` takes PCM16LE mono frames (at
`sampleRate`, default 16 kHz, any frame size), feeds the engine about a second
at a time, and yields:

- a **final** segment whenever the engine commits words (two consecutive
  passes agreed on them), with word timings measured from the start of the
  stream — join the finals with a space for the transcript;
- an **interim** segment carrying the unconfirmed tail whenever it changes.

Each stream runs on a worker of its own, so it never interleaves with batch
calls on the same handler.

```typescript
import { WhistleSTT } from "@juspay/neurolink";

const whistle = new WhistleSTT();
for await (const segment of whistle.transcribeStream(micFrames(), {
  language: "en",
})) {
  if (segment.isFinal) process.stdout.write(segment.text + " ");
}
```

---

## Audio formats

| Format                                                                | Decoded by     |
| --------------------------------------------------------------------- | -------------- |
| WAV — 8/16/24/32-bit PCM, 32/64-bit float, any rate and channel count | Whistle itself |
| raw `pcm16`                                                           | Whistle itself |
| mp3, m4a, mp4, ogg, opus, webm, flac, mpeg                            | ffmpeg         |

Compressed formats need ffmpeg: `FFMPEG_PATH`, the optional `ffmpeg-static`
package (`pnpm add ffmpeg-static`), or `ffmpeg` on `PATH`. Without one, the
call fails with an error that names the formats Whistle can read by itself.

---

## Environment variables

| Variable                          | Default | Meaning                                                         |
| --------------------------------- | ------- | --------------------------------------------------------------- |
| `NEUROLINK_WHISTLE_DIR`           | —       | Directory holding the three files                               |
| `NEUROLINK_MODEL_DIR`             | —       | Parent directory for local models; Whistle uses `<dir>/whistle` |
| `NEUROLINK_WHISTLE_AUTO_DOWNLOAD` | `1`     | `0` forbids the first-use download                              |
| `NEUROLINK_WHISTLE_KEYWORDS`      | `0`     | `1` enables keyword biasing from `vocabulary`                   |
| `FFMPEG_PATH`                     | —       | ffmpeg binary for compressed formats                            |

---

## Runtime behaviour

- One warm worker thread per `WhistleSTT` instance holds the engine and the
  model (~0.2 s to start); requests are answered in order. The worker is
  unreferenced while idle, so it never keeps your process alive; call
  `dispose()` to stop it early.
- If the worker crashes, the requests it held fail with an `STTError`, and the
  next call starts a fresh worker.

---

## Accuracy

Whistle is a 17 MB model. It is accurate on clear speech in its seven
languages, but it is **noticeably behind cloud engines** (Deepgram, ElevenLabs
Scribe, Google, Azure) **and large Whisper-class models** on accents,
background noise, overlapping speakers, rare names and domain jargon, and it
does not diarize. It is a sensible default for development, offline use and
privacy-sensitive audio; configure a cloud or self-hosted provider where
accuracy matters, or add a dictionary and the correction layer of
`transcribe()`.
