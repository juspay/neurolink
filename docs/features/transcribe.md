---
title: The transcribe inference type
description: Audio in, text out — transcribe() and transcribeStream(), the built-in local engine, dictionaries, the decision-guarded correction layer, fallback and second-opinion engines, the CLI command and the server routes.
keywords: transcribe, speech to text, stt, asr, whisper, dictionary, correction, transliteration, streaming transcription, openai audio transcriptions
---

# The `transcribe` inference type

NeuroLink has four inference types. `transcribe` is the one that starts from audio:

| Type             | Call                                                | Produces                         |
| ---------------- | --------------------------------------------------- | -------------------------------- |
| `generate`       | `neurolink.generate()`                              | text                             |
| `stream`         | `neurolink.stream()`                                | text, incrementally              |
| `decide`         | `neurolink.decide()`                                | typed judgements                 |
| **`transcribe`** | **`neurolink.transcribe()` / `transcribeStream()`** | **text from audio, with timing** |

It runs through any registered speech-to-text (STT) engine and adds the layers
that make an engine usable on real speech: a **dictionary** of names and
jargon, a **correction** pass guarded by the decision model and finished by an
LLM rewrite, a **second-opinion** engine, a **fallback** engine for audio the
first one cannot read, and **client-side streaming** for engines that only
take whole files.

**Zero configuration.** With no STT provider configured, `transcribe()` uses
**Whistle**, the built-in local engine: it runs on this machine, needs no key
and no network; its model files (about 18 MB) ship inside the package.
Whistle reads English, German, French, Spanish, Italian, Dutch and Polish; for
other languages, accents, noisy rooms or heavy jargon, configure a cloud or
self-hosted engine, or add a dictionary and correction.

## SDK

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.transcribe({
  audio: "./meeting.wav", // Buffer, Uint8Array, path, file:// or http(s):// URL
});

console.log(result.text);
console.log(result.engine, result.language, result.timings, result.steps);
```

`audio` accepts bytes (`Buffer`, `ArrayBuffer`, `Uint8Array`), a path, a
`file://` URL or an `http(s)://` URL. The container is inferred from the path
or the bytes; pass `format` (`"wav"`, `"mp3"`, `"m4a"`, `"ogg"`, `"opus"`,
`"webm"`, `"flac"`, `"mp4"`, `"pcm16"` …) for a buffer it cannot be read from.

### Options

| Option           | Meaning                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `provider`       | STT provider name or alias. Default: `NEUROLINK_STT_PROVIDER`, then the first configured provider, then Whistle.                  |
| `model`          | Model of that provider. Default: `NEUROLINK_STT_MODEL`, only when the provider also came from the environment.                    |
| `language`       | Language code or locale, or `"auto"`. Default: `NEUROLINK_STT_LANGUAGE`, else the engine detects it.                              |
| `prompt`         | Context prompt for engines that bias on one; dictionary terms are appended to it.                                                 |
| `diarization`    | Label speakers, on engines that diarize.                                                                                          |
| `wordTimestamps` | Ask for word-level timings.                                                                                                       |
| `dictionary`     | Names and jargon, see [Dictionary](#dictionary).                                                                                  |
| `correction`     | The correction layer, see [Correction](#correction).                                                                              |
| `fallback`       | `{ provider, model?, when? }`, see [Fallback](#fallback-and-second-opinion).                                                      |
| `streaming`      | Tuning for `transcribeStream()`, see [Streaming](#streaming).                                                                     |
| `timeoutMs`      | Whole-call timeout.                                                                                                               |
| `credentials`    | Per-call credentials; the `stt` slice (`credentials.stt.whisper.apiKey`, `credentials.stt.deepgram.apiKey` …) beats the env vars. |

### Result

`TranscribeResult` is the engine's `STTResult` (`text`, `confidence`,
`language`, `duration`, `words`, `segments`, `speakers`, `metadata`) plus what
the layers did:

| Field              | Meaning                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `raw`              | The engine's text before any correction.                                                                 |
| `text`             | The final text — the corrected text when correction changed it, else `raw`.                              |
| `corrected`        | Present only when correction changed the text.                                                           |
| `languageDetected` | `false` when the engine reported a low language-detection score.                                         |
| `languageScores`   | Candidate languages with the engine's own scores, where it reports them.                                 |
| `decisions`        | One record per dictionary candidate: what was heard, the term, `term` or `literal`, and the probability. |
| `engine`           | `{ provider, model, fallbackUsed?, secondOpinion? }`.                                                    |
| `timings`          | `transcribeMs`, `secondOpinionMs`, `decideMs`, `rewriteMs`, `correctionMs`, `totalMs`.                   |
| `steps`            | A readable trail: `"dictionary 2/2"`, `"rewrite timed out · kept text"` …                                |

## Providers and environment

| Provider (aliases)                            | Configured by                                                                               | Notes                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `whisper` (`openai-stt`, `openai-compatible`) | `OPENAI_STT_API_KEY` or `OPENAI_API_KEY`; `OPENAI_STT_BASE_URL` for another server          | Any OpenAI-compatible `/audio/transcriptions` endpoint. |
| `deepgram`                                    | `DEEPGRAM_API_KEY`                                                                          | Native streaming.                                       |
| `elevenlabs-stt` (`scribe`, `elevenlabs`)     | `ELEVENLABS_API_KEY`                                                                        |                                                         |
| `google-stt`                                  | `GOOGLE_API_KEY`, `GOOGLE_AI_API_KEY`, `GEMINI_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` |                                                         |
| `azure-stt`                                   | `AZURE_SPEECH_KEY`                                                                          |                                                         |
| `whistle` (`local`)                           | nothing                                                                                     | Built-in, local, always available.                      |

The order of that table is precedence: without `provider` or
`NEUROLINK_STT_PROVIDER`, the first configured provider is used, and Whistle
only when none is.

| Variable                          | Effect                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `NEUROLINK_STT_PROVIDER`          | Default provider for `transcribe()`, `transcribeStream()`, the CLI and the server routes.                                              |
| `NEUROLINK_STT_MODEL`             | Default model, applied with the provider from `NEUROLINK_STT_PROVIDER` / auto-selection.                                               |
| `NEUROLINK_STT_LANGUAGE`          | Default language when a call does not name one.                                                                                        |
| `NEUROLINK_WHISTLE_DIR`           | Where Whistle keeps its model files. Default: the copy shipped in the package (`models/whistle/`), else `~/.neurolink/models/whistle`. |
| `NEUROLINK_WHISTLE_AUTO_DOWNLOAD` | `0` forbids fetching the files into `~/.neurolink/models/whistle`; with the bundled copy present nothing is ever fetched.              |
| `FFMPEG_PATH`                     | ffmpeg binary for compressed input to Whistle and for `--stream` on non-WAV files.                                                     |

## Dictionary

A dictionary teaches the pipeline the words an engine cannot know — product
names, people's names, internal jargon — and how engines tend to mis-hear them:

```json
[
  {
    "term": "Acme Pay",
    "heardAs": ["acne pay", "ack me pay"],
    "meaning": "the company's payments product"
  },
  { "term": "Kubernetes", "heardAs": ["cooper netties"] }
]
```

| Field     | Required | Use                                                                                               |
| --------- | -------- | ------------------------------------------------------------------------------------------------- |
| `term`    | yes      | The correct spelling, written exactly like this in the output.                                    |
| `heardAs` | no       | Mis-hearings, in any script. Each one found in a transcript becomes a candidate for replacement.  |
| `meaning` | no       | What the term means, given to the decision model and the rewrite so they can tell term from word. |

The dictionary is used three ways: its terms are sent to engines that take a
prompt or vocabulary, each `heardAs` found in the transcript becomes a
candidate repair, and the whole list is given to the rewrite model.

## Correction

```typescript
const result = await neurolink.transcribe({
  audio: "./standup.m4a",
  dictionary,
  correction: {
    rewrite: { provider: "<text-provider>", model: "<fast-chat-model>" },
    transliterate: "latin",
    context: "A daily engineering stand-up about the payments service.",
  },
});
```

Correction runs on a finished transcript (or on each final utterance when
streaming), in two stages:

1. **Dictionary, guarded.** Each candidate is put to the decision model as one
   question — did the speaker mean the term, or the ordinary word? — so a
   product name never rewrites the everyday word it sounds like. All
   candidates go in one `tryDecide()` call. With no decision provider, on a
   timeout (`decideTimeoutMs`, default 4000) or on any error, the dictionary is
   applied as is. `guard: "none"` always applies it.
2. **Rewrite.** A text model fixes spelling, punctuation and capitalisation,
   writes dictionary terms correctly, reconciles a second opinion and writes
   Indic-script words in Latin letters the way people type them (Hinglish,
   Tanglish …) — never translating them. `transliterate: "native"` keeps the
   original script. `rewrite: false` stops after the dictionary.

| Option            | Default                                                                             | Meaning                                                                    |
| ----------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `enabled`         | on with a dictionary or any `correction` object, unless it is only `rewrite: false` | Run the layer at all.                                                      |
| `guard`           | `"decide"`                                                                          | `"decide"` asks the decision model per candidate; `"none"` always applies. |
| `decideTimeoutMs` | 4000                                                                                | Guard timeout.                                                             |
| `rewrite`         | the instance's default text provider                                                | `{ provider?, model?, timeoutMs? }` (timeout default 12000), or `false`.   |
| `transliterate`   | `"latin"`                                                                           | `"latin"` or `"native"`.                                                   |
| `punctuate`       | `true`                                                                              | Punctuation and capitalisation in the rewrite.                             |
| `secondOpinion`   | none                                                                                | `{ provider, model? }` — see below.                                        |
| `context`         | none                                                                                | One sentence about who is talking and about what.                          |
| `maxDropRatio`    | 0.25                                                                                | A rewrite that drops more than this share of the words is discarded.       |

### Nothing is ever dropped

Every layer fails open, and none may lose words:

- A rewrite that drops more than `maxDropRatio` of the words is discarded and
  the dictionary-applied text is kept.
- A rewrite that times out, fails or returns nothing keeps the text it was
  given.
- A guard that times out or fails applies the dictionary as is.
- When streaming, a final pass that returns less than the live text keeps the
  live text, and an utterance no engine could read is reported as a `silence`
  event with its length rather than disappearing.
- `raw` always holds the engine's own text, so a caller can show or diff it.

Each of those outcomes is written to `steps`, so a degraded path is visible
rather than silent.

## Fallback and second opinion

```typescript
await neurolink.transcribe({
  audio,
  provider: "<indic-capable-stt-provider>",
  fallback: { provider: "whisper", when: ["unsure", "empty", "error"] },
  correction: { secondOpinion: { provider: "whisper" } },
});
```

- **Fallback** takes the request (or, when streaming, the utterance) when the
  primary engine cannot read it: `when` defaults to `["unsure", "empty"]` — a
  low language-detection score, or no text — and `"error"` adds engine
  failures. `engine.fallbackUsed` says when it ran.
- **Second opinion** runs a second engine on the same audio in parallel; the
  rewrite reconciles the two transcripts, taking each language's words from the
  engine that reads it better. When the primary reports an unsure language,
  or no text, the second opinion's text leads. With `rewrite: false` that is
  all it does — there is no reconciliation without the rewrite.

## Streaming

```typescript
for await (const event of neurolink.transcribeStream({
  audio: micFrames, // AsyncIterable<Buffer> of PCM16LE mono
  streaming: { sampleRate: 16000 },
  dictionary,
})) {
  if (event.type === "interim") render(event.committed, event.tail);
  if (event.type === "final") commit(event.text);
  if (event.type === "corrected") replace(event.utterance, event.text);
}
```

Engines with a native stream use it; every other engine is streamed on the
client by a chunked adapter (an energy gate finds utterances, the current
utterance is re-transcribed every `intervalMs`, and the prefix two passes agree
on is committed). `streaming.mode: "chunked"` forces the adapter.

| Event        | Carries                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `interim`    | The utterance's current `text`, split into `committed` (stable) and `tail` (may still change). |
| `language`   | The detected language and whether the engine was sure.                                         |
| `final`      | The utterance's final text, segment and words, the engine, and whether the fallback took it.   |
| `correcting` | Partial text of the streamed rewrite.                                                          |
| `corrected`  | The corrected text, its `raw`, decisions, steps and timings.                                   |
| `silence`    | An utterance no engine could read, with its length.                                            |
| `error`      | A message, and `recoverable: true` when the stream carries on with the next utterance.         |

Tuning (`streaming`): `sampleRate` (16000), `endSilenceMs` (750), `intervalMs`
(900), `softCutSeconds` (16), `maxUtteranceSeconds` (28), `onsetRms` (0.006),
`prerollMs` (350), `minSpeechMs` (250).

## CLI

```bash
neurolink transcribe meeting.wav
neurolink transcribe call.mp3 --term "Acme Pay|acne pay,ack me pay|the payments product" --correct
neurolink transcribe standup.m4a --dictionary terms.json --rewrite-model <fast-chat-model> --transliterate latin
neurolink transcribe talk.wav --word-timestamps --format srt > talk.srt
cat clip.wav | neurolink transcribe - --stream
```

The text output is the transcript, then a dim line with the engine, the
language (`detected` or `unsure`), the audio length, each layer's time and the
steps. `--format json` prints the whole `TranscribeResult` (one event per line
with `--stream`); `--format srt|vtt` builds subtitle cues from the segments, or
from the word timings. `--stream` decodes the file to 16 kHz mono PCM16 (WAV in
process, anything else through ffmpeg) and runs it through
`transcribeStream()`. Credentials are env-only, as for every CLI command. The
full flag table is in the [CLI reference](../cli/commands.md#transcribe).

## Server routes

`createAllRoutes()` / `registerAllRoutes()` mount two routes on every adapter
(Hono, Express, Fastify, Koa); `createTranscribeRoutes(basePath, options)`
mounts them on their own. Neither accepts credentials: engines use the
server's own configuration, and a `credentials` field in a body is ignored.

### `POST /api/agent/transcribe`

JSON body with exactly one audio source:

```json
{
  "audio": "<base64 or data: URL>",
  "format": "wav",
  "provider": "<stt-provider>",
  "language": "auto",
  "dictionary": [{ "term": "Acme Pay", "heardAs": ["acne pay"] }],
  "correction": { "rewrite": { "model": "<fast-chat-model>" } },
  "fallback": { "provider": "<stt-provider>" },
  "diarization": false,
  "wordTimestamps": true
}
```

| Source      | Rules                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `audio`     | Base64, or a `data:audio/...;base64,` URL. Bounded by the adapter's JSON body limit (`bodyParser.jsonLimit`, 10 MB by default). |
| `audioUrl`  | An `http(s)` URL the server downloads through the SSRF guard (private addresses and redirects refused), capped in size.         |
| `audioPath` | A path on the server. **Refused by default**; allowed only inside the directories in `transcribe.allowedAudioRoots`.            |

The response is the `TranscribeResult`, in the adapters' usual
`{ data, metadata }` envelope. Errors use the usual error shape: 400 for an
invalid body or an unsupported provider, language or format, 403 for a refused
`audioPath`, 413 for audio over the limit, 500 for an engine failure.

### `POST /v1/audio/transcriptions` (OpenAI-compatible)

`multipart/form-data`, the way OpenAI's API takes it, so an OpenAI client
pointed at `http://<host>:<port>/v1` works unchanged:

| Field                       | Meaning                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `file`                      | The audio (required). Its name or type sets the container.                                                  |
| `model`                     | `<provider>` or `<provider>/<model>`. OpenAI's own model names and `auto` mean the server's default engine. |
| `language`, `prompt`        | As in the SDK.                                                                                              |
| `response_format`           | `json` (`{ "text" }`, the default), `text` (plain text) or `verbose_json`.                                  |
| `timestamp_granularities[]` | `word` requests word timings.                                                                               |
| `temperature`               | Accepted and ignored.                                                                                       |
| `provider`                  | Extension: the STT provider, overriding `model`.                                                            |
| `diarize`                   | Extension: `true` labels speakers.                                                                          |
| `dictionary`                | Extension: the dictionary as a JSON string.                                                                 |
| `correct`                   | Extension: `true` runs the correction layer.                                                                |
| `fallback`                  | Extension: fallback STT provider.                                                                           |
| `second_opinion`            | Extension: second-opinion STT provider (turns correction on).                                               |

`verbose_json` returns OpenAI's shape — `task`, `text`, `language`, `duration`,
`segments[]` (`id`, `start`, `end`, `text`), `words[]` (`word`, `start`,
`end`) — plus NeuroLink's extras: `raw`, `corrected`, `decisions`, `engine`,
`language_detected`, `steps` and `timings`. Errors use OpenAI's error shape.
The upload is bounded by the adapter's `bodyParser.maxSize` (10 MB by
default); raise it to accept OpenAI's 25 MB.

Route options (`registerAllRoutes(server, "/api", { transcribe: { ... } })`):

| Option              | Default | Meaning                                                                         |
| ------------------- | ------- | ------------------------------------------------------------------------------- |
| `allowedAudioRoots` | none    | Directories `audioPath` may read from; without it every `audioPath` is refused. |
| `maxAudioBytes`     | 50 MB   | Largest audio accepted from any source.                                         |
| `openaiBasePath`    | `""`    | Prefix of the OpenAI-compatible route.                                          |

### WebSocket `/v1/audio/transcriptions/stream`

The route adapters do not handle WebSocket upgrades, so the streaming endpoint
attaches to the Node HTTP server you own:

```typescript
import http from "node:http";
import { attachTranscribeWebSocket } from "@juspay/neurolink/server";

const server = http.createServer(handler);
const socket = await attachTranscribeWebSocket(server, neurolink, {
  authToken: process.env.TRANSCRIBE_WS_TOKEN, // Authorization: Bearer, or ?token=
});
server.listen(3000);
```

1. The first frame is **text**: a JSON config with the JSON route's fields
   minus the audio, plus `streaming` (for example `{ "language": "auto",
"streaming": { "sampleRate": 16000 } }`).
2. Then **binary** frames of PCM16LE mono audio at that sample rate.
3. A text frame `{ "type": "end" }`, or closing the socket, ends the audio.

The server sends one JSON text frame per `TranscribeStreamEvent` and closes
with 1000 when the stream is done; an invalid config gets an `error` event and
close code 1008.
