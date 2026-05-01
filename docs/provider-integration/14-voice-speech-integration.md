# 14 · Voice / Speech Integration — Implementation Journal

Commit: `27a31c32` — `feat(voice): add multi-provider TTS, STT, and realtime voice integration`

---

## Architecture

### How voice plugs into Factory + Registry

The voice integration does not add AI providers (it adds no entries to `AIProviderName`). Instead it introduces **three parallel static registries** that mirror the `ProviderFactory` / `ProviderRegistry` pattern for non-LLM capabilities:

```
ProviderFactory    →  creates LLM provider instances
ProviderRegistry   →  holds LLM factory functions (dynamic imports)

TTSProcessor       →  static Map<string, TTSHandler>  (text-to-speech)
STTProcessor       →  static Map<string, STTHandler>  (speech-to-text)
RealtimeProcessor  →  static Map<string, RealtimeHandler>  (bidirectional voice)
```

Each processor exposes `registerHandler(name, handler)` and the appropriate operation (`synthesize`, `transcribe`, `connect`). The same `O(1)` Map lookup and lazy-instantiation pattern used by `ProviderRegistry` applies here.

### Registration location

All handler registration happens at the **bottom** of `ProviderRegistry.registerAllProviders()` in `src/lib/factories/providerRegistry.ts`, after all LLM providers are registered. The order is:

1. LLM providers (existing)
2. TTS handler registration block
3. STT handler registration block
4. Realtime handler registration block

Each block uses a separate `try/catch` so a missing API key or a broken import cannot prevent the LLM providers from registering. Registration is fire-and-forget: failures log a `warn` and continue.

All imports inside the registration blocks are **dynamic** (`await import(...)`), matching CLAUDE.md rule #1 and preventing circular dependencies.

```ts
// Pattern used for every voice handler:
try {
  const { TTSProcessor } = await import("../utils/ttsProcessor.js");
  const { OpenAITTS } = await import("../voice/providers/OpenAITTS.js");
  TTSProcessor.registerHandler("openai-tts", new OpenAITTS());
} catch {
  /* Optional provider — skip if unavailable */
}
```

### STT preprocessing in `neurolink.ts runStandardGenerateRequest()`

When a caller passes `{ stt: { enabled: true, audio: buffer } }` to `generate()`, the following happens inside `runStandardGenerateRequest()` before the LLM call:

1. `ProviderRegistry.isRegistered()` is checked; if false, `registerAllProviders()` is awaited.
2. `STTProcessor` is dynamically imported and `transcribe(audio, providerName, sttOptions)` is called.
3. The transcription text is injected into the LLM prompt:
   - If no user text exists, the transcription becomes the prompt directly.
   - If user text exists, the transcription is prepended as `[Transcribed audio]: <text>\n\n<user text>`.
4. `generateResult.transcription` is set to the `STTResult` object (available to callers).
5. Transcription failures log an error but **do not block** generation — STT is optional.

### Type organisation

Three new canonical type files added to `src/lib/types/` (CLAUDE.md rule #8 compliant — no "Types" suffix):

| File                        | Contents                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/tts.ts`      | Extended `AudioFormat` (added `m4a`, `flac`, `webm`, `mp4`, `mpeg`, `mpga`); added `TTSOptions.provider` field                                           |
| `src/lib/types/stt.ts`      | `STTHandler`, `STTOptions`, `STTResult`, `STTLanguage`, `WordTiming`, `TranscriptionSegment`, `STT_ERROR_CODES`, `DEFAULT_STT_OPTIONS`, guards           |
| `src/lib/types/realtime.ts` | `RealtimeHandler`, `RealtimeConfig`, `RealtimeSession`, `RealtimeAudioChunk`, `RealtimeSessionState`, `REALTIME_ERROR_CODES`, `DEFAULT_REALTIME_CONFIG`  |
| `src/lib/types/voice.ts`    | Aggregator: re-exports all of `tts.ts`, `stt.ts`, `realtime.ts`; adds `VoiceCapability`, `VoiceProviderName`, `VoiceProviderConfig`, `VoiceErrorOptions` |

`src/lib/types/index.ts` gets two new `export *` lines (for `stt.ts` and `realtime.ts`; `voice.ts` is already present). All rules 9 and 10 apply: type names are globally unique, barrel uses `export *` only.

---

## TTS Providers Added

### `openai-tts`

- **File:** `src/lib/voice/providers/OpenAITTS.ts` (253 lines, NEW)
- **Class:** `OpenAITTS implements TTSHandler`
- **API:** `POST https://api.openai.com/v1/audio/speech`
- **Auth:** `Authorization: Bearer $OPENAI_API_KEY`
- **Models:** `tts-1` (standard, default) and `tts-1-hd` (high quality; selected when `options.quality === "hd"`)
- **Voices (6):** `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- **Output formats:** `mp3` (default), `wav`, `opus`/`ogg` (mapped to OpenAI's `opus`)
- **Max text:** 4 096 characters
- **Registered as:** `"openai-tts"` in `TTSProcessor`
- **Timeout:** 30-second `AbortController` on every `fetch` call; throws `TTSError` with `TTS_ERROR_CODES.SYNTHESIS_FAILED` on abort

### `elevenlabs`

- **File:** `src/lib/voice/providers/ElevenLabsTTS.ts` (326 lines, NEW)
- **Class:** `ElevenLabsTTS implements TTSHandler`
- **API:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=...`
- **Auth:** `xi-api-key: $ELEVENLABS_API_KEY`
- **Model:** `eleven_multilingual_v2` (default)
- **Voices:** Dynamic — fetched from `/v1/voices` and cached for 5 minutes. Default voice: `21m00Tcm4TlvDq8ikWAM` (Rachel).
- **Output formats:** `mp3_44100_128` (mp3), `pcm_44100` (wav), `ogg_22050` (ogg/opus)
- **Voice settings:** `stability` (default 0.5), `similarity_boost` (0.75), `style` (0.0), `use_speaker_boost` (true)
- **Max text:** 5 000 characters
- **Registered as:** `"elevenlabs"` and `"elevenlabs-tts"` in `TTSProcessor`
- **Timeout:** 30-second `AbortController` on `synthesize` and `getVoices` calls

### `azure-tts`

- **File:** `src/lib/voice/providers/AzureTTS.ts` (357 lines, NEW)
- **Class:** `AzureTTS implements TTSHandler`
- **API:** `POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`
- **Auth:** `Ocp-Apim-Subscription-Key: $AZURE_SPEECH_KEY`
- **Region:** `$AZURE_SPEECH_REGION` (default `"eastus"`)
- **Default voice:** `en-US-JennyNeural`
- **Output format (default):** `audio-24khz-96kbitrate-mono-mp3`
- **SSML:** The handler builds SSML automatically from `text`, `voice`, `speed`, and `pitch` options. Callers can pass raw SSML by setting `text` to a string starting with `<speak` or by providing `options.ssmlTemplate`.
- **Voices:** Fetched from `/cognitiveservices/voices/list` and cached for 30 minutes.
- **Max text:** 10 000 characters
- **Registered as:** `"azure-tts"` in `TTSProcessor`
- **Timeout:** 30-second `AbortController` on all fetch calls

---

## STT Providers Added

### `whisper` / `openai-stt`

- **File:** `src/lib/voice/providers/OpenAISTT.ts` (317 lines, NEW)
- **Class:** `OpenAISTT implements STTHandler` (exported also as `WhisperSTT`, `WhisperSTTHandler`, `OpenAISTTHandler`)
- **API:** `POST https://api.openai.com/v1/audio/transcriptions` (or `/translations` when `translate: true`)
- **Auth:** `Authorization: Bearer $OPENAI_API_KEY`
- **Model:** `whisper-1` (default)
- **Response format:** `verbose_json` (default) — returns `text`, `language`, `duration`, `words`, `segments`
- **Word timestamps:** Enabled when `options.wordTimestamps === true` (sends `timestamp_granularities[]=word&segment`)
- **Confidence:** Fixed at `0.95` (Whisper does not return per-result confidence); segment confidence derived from `Math.exp(segment.avg_logprob)`
- **Max audio:** 25 minutes
- **Supported formats:** `mp3`, `wav`, `ogg`, `opus`
- **Streaming:** Not supported (`supportsStreaming = false`)
- **Registered as:** `"whisper"` and `"openai-stt"` in `STTProcessor`
- **Timeout:** 30-second `AbortController` on the `fetch` multipart form POST

### `google-stt`

- **File:** `src/lib/voice/providers/GoogleSTT.ts` (481 lines, NEW)
- **Class:** `GoogleSTT implements STTHandler`
- **API:** `POST https://speech.googleapis.com/v1/speech:recognize`
- **Auth:** `$GOOGLE_API_KEY` (query param) or `$GOOGLE_APPLICATION_CREDENTIALS` (service account path)
- **Streaming:** Supported (`supportsStreaming = true`)
- **Max audio:** 480 minutes (8 hours, async path)
- **Diarization:** Supported
- **Registered as:** `"google-stt"` in `STTProcessor`
- **Timeout:** 30-second `AbortController`

### `deepgram`

- **File:** `src/lib/voice/providers/DeepgramSTT.ts` (547 lines, NEW)
- **Class:** `DeepgramSTT implements STTHandler`
- **API:** `POST https://api.deepgram.com/v1/listen`
- **Auth:** `Authorization: Token $DEEPGRAM_API_KEY`
- **Models:** Nova-2 (default), Nova-3
- **Streaming:** Supported via WebSocket (`supportsStreaming = true`)
- **Speaker diarization:** Supported
- **Max audio:** 2 hours (`maxAudioDuration = 7200`)
- **Supported formats:** `mp3`, `wav`, `ogg`, `opus`
- **Registered as:** `"deepgram"` in `STTProcessor`
- **Timeout:** 30-second `AbortController` on REST calls

### `azure-stt`

- **File:** `src/lib/voice/providers/AzureSTT.ts` (374 lines, NEW)
- **Class:** `AzureSTT implements STTHandler`
- **API:** Azure Cognitive Services Speech SDK REST endpoint
- **Auth:** `$AZURE_SPEECH_KEY` + `$AZURE_SPEECH_REGION`
- **Streaming:** Supported
- **Registered as:** `"azure-stt"` in `STTProcessor`
- **Timeout:** 30-second `AbortController`

---

## Realtime Providers Added (registered, not yet SDK-exposed)

Both realtime providers are registered in `ProviderRegistry.registerAllProviders()` but are **not yet accessible via public `NeuroLink` SDK methods**. They exist as handler registrations ready for future surfacing.

### `openai-realtime`

- **File:** `src/lib/voice/providers/OpenAIRealtime.ts` (475 lines, NEW)
- **Class:** `OpenAIRealtime extends BaseRealtimeHandler`
- **Transport:** WebSocket (`wss://api.openai.com/v1/realtime`)
- **Auth:** `Authorization: Bearer $OPENAI_API_KEY` + `OpenAI-Beta: realtime=v1` headers
- **Supported formats:** `wav`, `opus`
- **Registered as:** `"openai-realtime"` in `RealtimeProcessor`

### `gemini-live`

- **File:** `src/lib/voice/providers/GeminiLive.ts` (413 lines, NEW)
- **Class:** `GeminiLive extends BaseRealtimeHandler`
- **Transport:** WebSocket (Gemini Live API)
- **Auth:** `$GOOGLE_API_KEY`
- **Supported formats:** `opus`, `wav`
- **Registered as:** `"gemini-live"` in `RealtimeProcessor`

Both extend `BaseRealtimeHandler` (in `src/lib/voice/RealtimeVoiceAPI.ts`), which manages connection state, session lifecycle, and event emission via `EventEmitter`.

---

## Key Design Decisions

### Everything through `generate()` / `stream()`

No new top-level `NeuroLink` methods were added (`synthesize`, `transcribe`, `startRealtimeVoice` are intentionally absent). All voice capability is driven through the existing option objects:

```ts
// TTS — same as before
await neurolink.generate({
  prompt: "...",
  tts: { enabled: true, voice: "alloy", provider: "openai-tts" },
});

// STT — new
await neurolink.generate({
  stt: { enabled: true, audio: audioBuffer, provider: "whisper" },
  // prompt is optional; transcription becomes the prompt if omitted
});

// Round-trip — STT input, LLM, TTS output
await neurolink.generate({
  stt: { enabled: true, audio: audioBuffer, provider: "whisper" },
  tts: { enabled: true, provider: "elevenlabs", voice: "21m00Tcm4TlvDq8ikWAM" },
});
```

This preserves backward compatibility (CLAUDE.md rule #5) — existing callers are unaffected.

### STT preprocessing logic

The preprocessing runs in `runStandardGenerateRequest()` after options validation and before `generateTextInternal()`. Key properties:

- `options.stt.provider` defaults to `options.provider` (the LLM provider name) then falls back to `"whisper"`.
- Transcription failure is non-fatal: logged with `logger.error` and `generate()` continues with the un-augmented prompt.
- `result.transcription` (type `STTResult`) is attached to the `GenerateResult` when transcription succeeds.

### Fetch timeouts

Every provider API call wraps its `fetch` in a 30-second `AbortController`:

```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
try {
  response = await fetch(url, { ..., signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

`AbortError` is caught and re-thrown as a typed `TTSError` / `STTError` with a human-readable message. This pattern is consistent across all 7 new providers.

### Audio utilities (`src/lib/voice/audio-utils.ts`)

552-line utility module with no external dependencies beyond Node.js built-ins:

| Export                                                           | Purpose                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| `detectAudioFormat(buffer)`                                      | Identifies `wav`, `mp3`, `ogg`, `opus` from magic bytes |
| `createWavHeader(samples, sampleRate, channels, bitsPerSample)`  | Builds a 44-byte RIFF/WAV header                        |
| `createWavFile(pcmData, sampleRate, channels, bitsPerSample)`    | Header + PCM data                                       |
| `createPcmBuffer(durationMs, sampleRate, frequency)`             | Generates a sine-wave PCM buffer (for testing)          |
| `extractPcmSamples(buffer)`                                      | Reads 16-bit LE PCM samples from a WAV                  |
| `normalizeAudio(samples)`                                        | Scales to peak 0.9                                      |
| `resamplePcm(samples, fromRate, toRate)`                         | Linear interpolation resampling                         |
| `calculateDuration(buffer, sampleRate, channels, bitsPerSample)` | Duration in seconds                                     |
| `splitIntoChunks(buffer, chunkSize)`                             | Splits a Buffer into equal-size chunks                  |
| `convertAudioFormat(buffer, from, to)`                           | Best-effort format conversion (wav↔pcm only for now)    |
| `getMimeType(format)` / `getFileExtension(format)`               | Format → MIME / extension                               |
| `AUDIO_SIGNATURES`                                               | Magic-byte constants per format                         |
| `MIME_TYPES`                                                     | Format → MIME map constant                              |

### Stream infrastructure (`src/lib/voice/stream-handler.ts`)

546-line module providing:

| Export                                    | Purpose                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `ChunkedAudioStream extends EventEmitter` | Slices incoming audio into fixed-duration chunks (default 100 ms) with backpressure management |
| `StreamHandler extends EventEmitter`      | Generic event-driven handler with start/stop and error propagation                             |
| `StreamSplitter`                          | Fan-out: one input → multiple output streams                                                   |
| `StreamMerger`                            | Fan-in: multiple input streams → one output                                                    |
| `asyncIterableToStream(iterable)`         | Converts `AsyncIterable<Buffer>` → Node `Readable`                                             |
| `streamToAsyncIterable(stream)`           | Converts Node `Readable` → `AsyncIterable<Buffer>`                                             |

`ChunkedAudioStream` defaults: `chunkDurationMs=100`, `sampleRate=16000`, `bytesPerSample=2`, `highWaterMark=64KB`.

---

## Error Handling

Three new error classes in `src/lib/voice/errors.ts` (all extend `NeuroLinkError`):

| Class           | Default category | Default severity |
| --------------- | ---------------- | ---------------- |
| `VoiceError`    | `EXECUTION`      | `MEDIUM`         |
| `STTError`      | `VALIDATION`     | `MEDIUM`         |
| `RealtimeError` | `EXECUTION`      | `HIGH`           |

`TTSError` lives in `src/lib/utils/ttsProcessor.ts` (pre-existing; not in `errors.ts`).

`STTError` includes static factory methods: `audioEmpty`, `audioTooLong`, `invalidFormat`, `languageNotSupported`, `transcriptionFailed`, `providerNotConfigured`, `providerNotSupported`, `streamError`.

`RealtimeError` includes: `connectionFailed`, `sessionTimeout`, `protocolError`, `audioStreamError`, `providerNotConfigured`, `sessionAlreadyActive`, `sessionNotActive`, `invalidMessage`.

---

## CLI Changes

New flags added to `src/cli/commands/voice.ts` and propagated via `src/cli/factories/commandFactory.ts`:

| Flag             | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `--stt`          | Enable STT preprocessing                                              |
| `--stt-provider` | Which STT provider to use (default: `whisper`)                        |
| `--input-audio`  | Path to audio file for STT                                            |
| `--stt-language` | BCP-47 language code for transcription                                |
| `--tts-provider` | Override TTS provider (e.g., `openai-tts`, `elevenlabs`, `azure-tts`) |

The `--tts` and `--tts-voice` flags are pre-existing.

---

## Testing

Test suite: `test/continuous-test-suite-voice.ts` (1 822 lines, NEW)

The suite is invoked as:

```bash
npx tsx test/continuous-test-suite-voice.ts --provider=vertex
```

It covers 15 test items via the consumer API only — no direct provider class calls:

| #    | Test                        | Notes                                                                                    |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------- |
| 1    | `generate()` + TTS MP3      | Validates MP3 magic bytes (`0xFF 0xFB` or `0x49 0x44 0x33`)                              |
| 2    | `generate()` + TTS WAV      | Validates RIFF header (`0x52 0x49 0x46 0x46`)                                            |
| 3    | Unconfigured TTS provider   | Verifies `azure-tts` without keys errors gracefully                                      |
| 4    | `generate()` + STT          | Validates `result.transcription.confidence` is numeric                                   |
| 5    | STT + TTS round-trip        | Audio in → LLM → audio out; validates both transcription and MP3 output                  |
| 6–8  | `stream()` + TTS            | Validates `StreamResult` with audio chunks                                               |
| 9–10 | CLI `--tts` / `--stt` flags | Spawns CLI subprocess, validates exit code and JSON output                               |
| 11   | Handler registration check  | Verifies `TTSProcessor`, `STTProcessor`, `RealtimeProcessor` have expected provider keys |
| 12   | Audio utility validation    | `detectAudioFormat`, `createWavHeader`, `splitIntoChunks`, `resamplePcm`                 |
| 13   | `ChunkedAudioStream`        | Validates chunking and event emission                                                    |
| 14   | Barrel exports              | `VOICE_ERROR_CODES`, `STT_ERROR_CODES`, `REALTIME_ERROR_CODES`, `DEFAULT_STT_OPTIONS`    |
| 15   | Removed method guard        | Asserts `synthesize`, `transcribe`, `startRealtimeVoice` do NOT exist on `NeuroLink`     |

**Real API results logged in commit message:**

| Provider             | Phrase                            | Confidence        |
| -------------------- | --------------------------------- | ----------------- |
| Whisper (openai-stt) | "The quick brown fox..."          | 0.95              |
| Deepgram             | same                              | 1.0               |
| Google STT           | same                              | 0.98              |
| Azure STT            | same                              | 0.9               |
| Full round-trip      | Whisper → Vertex LLM → ElevenLabs | 126 KB MP3 output |

---

## Files Changed

### New files (11)

| File                                        | Lines | Purpose                                   |
| ------------------------------------------- | ----- | ----------------------------------------- |
| `src/lib/voice/providers/OpenAITTS.ts`      | 253   | OpenAI TTS handler                        |
| `src/lib/voice/providers/ElevenLabsTTS.ts`  | 326   | ElevenLabs TTS handler                    |
| `src/lib/voice/providers/AzureTTS.ts`       | 357   | Azure Cognitive Services TTS handler      |
| `src/lib/voice/providers/OpenAISTT.ts`      | 317   | Whisper / OpenAI STT handler              |
| `src/lib/voice/providers/DeepgramSTT.ts`    | 547   | Deepgram STT handler                      |
| `src/lib/voice/providers/GoogleSTT.ts`      | 481   | Google Cloud STT handler                  |
| `src/lib/voice/providers/AzureSTT.ts`       | 374   | Azure Cognitive Services STT handler      |
| `src/lib/voice/providers/OpenAIRealtime.ts` | 475   | OpenAI Realtime (WebSocket) handler       |
| `src/lib/voice/providers/GeminiLive.ts`     | 413   | Gemini Live (WebSocket) handler           |
| `src/lib/voice/audio-utils.ts`              | 552   | Audio format detection, WAV/PCM utilities |
| `src/lib/voice/stream-handler.ts`           | 546   | Chunked streaming, fan-out/fan-in         |

### Substantially extended files (4)

| File                                | Change                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/voice/RealtimeVoiceAPI.ts` | 516 lines added — `BaseRealtimeHandler` (abstract) and `RealtimeProcessor` (static handler registry with connect/send/disconnect)                             |
| `src/lib/voice/errors.ts`           | 464 lines added — `VoiceError`, `STTError`, `RealtimeError` with full static factory methods                                                                  |
| `src/lib/voice/index.ts`            | 125 lines added — barrel for all voice exports                                                                                                                |
| `src/lib/utils/sttProcessor.ts`     | 319 lines added — `STTProcessor` static registry with `transcribe`, `getHandler`, `supports`, `registerHandler`, span instrumentation matching `TTSProcessor` |

### New type files (2)

| File                        | Lines | Purpose                                            |
| --------------------------- | ----- | -------------------------------------------------- |
| `src/lib/types/stt.ts`      | 772   | All STT types, error codes, constants, type guards |
| `src/lib/types/realtime.ts` | 322   | All Realtime types, error codes, constants, guards |

### Modified files

| File                                            | Change                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/types/tts.ts`                          | Extended `AudioFormat` union with 6 additional formats; added `TTSOptions.provider`                        |
| `src/lib/types/voice.ts`                        | Now re-exports `stt.ts` and `realtime.ts`; adds voice-level union types                                    |
| `src/lib/types/index.ts`                        | New `export *` for `stt.ts` and `realtime.ts`                                                              |
| `src/lib/types/generate.ts`                     | Added `stt` option block to `GenerateOptions`; added `transcription: STTResult` to `GenerateResult`        |
| `src/lib/types/stream.ts`                       | Minor additions for audio stream result types                                                              |
| `src/lib/types/span.ts`                         | Added `SpanType.STT` enum value                                                                            |
| `src/lib/factories/providerRegistry.ts`         | TTS, STT, and Realtime handler registration blocks at end of `registerAllProviders()`                      |
| `src/lib/neurolink.ts`                          | STT preprocessing in `runStandardGenerateRequest()`; TTS option threading to stream/generate               |
| `src/cli/commands/voice.ts`                     | New `--stt`, `--stt-provider`, `--input-audio`, `--stt-language`, `--tts-provider` flags                   |
| `src/lib/server/voice/voiceWebSocketHandler.ts` | Refactored to use `STTProcessor` / `TTSProcessor` / `RealtimeProcessor` instead of direct provider classes |
| `.env.example`                                  | Added `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`                  |
| `test/continuous-test-suite-voice.ts`           | 1 822-line new test suite                                                                                  |

---

## Smoke Tests

```bash
# Build first
pnpm run build:cli

# TTS: OpenAI
export OPENAI_API_KEY="sk-..."
pnpm run cli generate "Hello world" --tts --tts-provider openai-tts --tts-voice nova

# TTS: ElevenLabs
export ELEVENLABS_API_KEY="..."
pnpm run cli generate "Hello world" --tts --tts-provider elevenlabs

# STT: Whisper
export OPENAI_API_KEY="sk-..."
pnpm run cli generate --stt --stt-provider whisper --input-audio recording.wav

# STT + TTS round-trip
pnpm run cli generate --stt --stt-provider whisper --input-audio recording.wav \
  --tts --tts-provider openai-tts --provider openai

# Full test suite (requires Vertex credentials)
npx tsx test/continuous-test-suite-voice.ts --provider=vertex
```

---

## Backward Compatibility

- No changes to `AIProviderName` enum — existing provider callers unaffected.
- No new public `NeuroLink` methods — interface extends only through option fields.
- `AudioFormat` type extended additively — existing `"mp3" | "wav" | "ogg" | "opus"` values unchanged.
- `GenerateOptions.stt` and `GenerateResult.transcription` are optional — callers not passing `stt` see no change in behaviour.
- `TTSProcessor` pre-existing registration for `google-ai` and `vertex` (via `GoogleTTSHandler`) is unmodified.
