# 17 · Adding a New STT Provider — Exhaustive Guide

This guide adds a new Speech-to-Text provider (e.g., AssemblyAI, Gladia, Rev.ai, Speechmatics, Sarvam STT) to NeuroLink.

The pattern is established by `OpenAISTT`, `DeepgramSTT`, `GoogleSTT`, `AzureSTT` shipped in commit `27a31c32`. The skeleton mirrors [`16-adding-tts-provider.md`](16-adding-tts-provider.md) — read that first if you haven't already.

---

## TL;DR — The 6-file checklist

| #   | File                                    | Action                                   |
| --- | --------------------------------------- | ---------------------------------------- |
| 1   | `src/lib/voice/providers/<Name>STT.ts`  | NEW — handler implementing `STTHandler`  |
| 2   | `src/lib/factories/providerRegistry.ts` | EDIT — registration block in STT section |
| 3   | `src/lib/voice/index.ts`                | EDIT — re-export class                   |
| 4   | `src/lib/types/voice.ts`                | EDIT — add to `VoiceProviderName` union  |
| 5   | `.env.example`                          | EDIT — env vars                          |
| 6   | `test/continuous-test-suite-voice.ts`   | EDIT — add test section                  |

Plus 2–4 doc files (per-provider guide, features/audio-input.md update, comparison/selection updates).

---

## Architecture recap

```
nl.generate({ stt: { enabled: true, audio, provider } })
  ↓
neurolink.ts::runStandardGenerateRequest()  // STT preprocessing
  ↓
STTProcessor.transcribe(audio, provider, options)  // utils/sttProcessor.ts
  ↓
handler = STTProcessor.handlers.get(provider.toLowerCase())
  ↓
handler.transcribe(audio, options): Promise<STTResult>
  ↓
result.text injected as prompt or prepended to existing text
  ↓
LLM call proceeds; result.transcription contains the STTResult
```

Handler contract (in `src/lib/types/stt.ts`):

```typescript
export type STTHandler = {
  transcribe(audio: Buffer | string, options: STTOptions): Promise<STTResult>;
  transcribeStream?(
    audio: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment>;
  isConfigured(): boolean;
  supportsStreaming?: boolean;
  maxAudioDuration?: number; // seconds
  supportedFormats?: TTSAudioFormat[];
};
```

---

## Step 1 — Create the handler class

**File:** `src/lib/voice/providers/<Name>STT.ts` — NEW.

Skeleton, modelled on `DeepgramSTT.ts`:

```typescript
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { STTError } from "../errors.js";
import { STT_ERROR_CODES } from "../../types/index.js";
import type {
  STTHandler,
  STTOptions,
  STTResult,
  TTSAudioFormat,
  TranscriptionSegment,
  WordTiming,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

const REQUEST_TIMEOUT_MS = 30_000;

export class <Name>STT implements STTHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.<provider>.com/v1";

  /** Provider streaming support. */
  public readonly supportsStreaming = false;

  /** Maximum audio duration in seconds. */
  public readonly maxAudioDuration = 7200; // 2 hours

  /** Audio formats accepted by the upstream. */
  public readonly supportedFormats: TTSAudioFormat[] = [
    "mp3", "wav", "ogg", "opus", "flac", "m4a", "webm",
  ];

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.<NAME>_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async transcribe(
    audio: Buffer | string,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("<provider-name>");
    }

    // Resolve audio: Buffer or path
    const audioBuffer = await this.resolveAudio(audio);

    // Validate format / size
    if (audioBuffer.length === 0) {
      throw STTError.audioEmpty("<provider-name>");
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(this.buildUrl(options), {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,        // Deepgram pattern
          "Content-Type": this.detectContentType(audioBuffer),
        },
        body: audioBuffer,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw STTError.transcriptionFailed(
          "<provider-name>",
          `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          { retriable: true },
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      const retriable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw STTError.transcriptionFailed("<provider-name>", errorText, {
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status },
      });
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    // Map upstream schema → STTResult
    const result: STTResult = {
      text: data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "",
      confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 1.0,
      language: data.metadata?.language,
      duration: data.metadata?.duration,
      words: this.extractWords(data),
      segments: this.extractSegments(data),
      metadata: {
        latency,
        provider: "<provider-name>",
        model: options.model ?? "default",
      },
    };

    logger.info(
      `[<Name>STT] Transcribed ${audioBuffer.length} bytes in ${latency}ms ` +
      `→ ${result.text.length} chars (confidence ${result.confidence})`,
    );

    return result;
  }

  // Optional — only if the provider supports WebSocket / SSE streaming
  async *transcribeStream(
    audio: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.apiKey) throw STTError.providerNotConfigured("<provider-name>");
    // Open WebSocket, push audio chunks, yield TranscriptionSegment per result
    // See DeepgramSTT.ts:243-540 for the canonical WebSocket implementation
  }

  private async resolveAudio(audio: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(audio)) return audio;
    const fs = await import("node:fs/promises");
    return fs.readFile(audio);
  }

  private buildUrl(options: STTOptions): string {
    const params = new URLSearchParams();
    if (options.language) params.set("language", options.language);
    if (options.model) params.set("model", options.model);
    if (options.diarization) params.set("diarize", "true");
    if (options.wordTimestamps) params.set("punctuate", "true");
    return `${this.baseUrl}/listen?${params}`;
  }

  private detectContentType(buffer: Buffer): string {
    // Use detectAudioFormat from voice/audio-utils.ts for production code
    if (buffer[0] === 0x52 && buffer[1] === 0x49) return "audio/wav";
    if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return "audio/mpeg";
    if (buffer[0] === 0x4F && buffer[1] === 0x67) return "audio/ogg";
    return "audio/wav";
  }

  private extractWords(data: unknown): WordTiming[] {
    // Map upstream word-timing schema → WordTiming[]
    return [];
  }

  private extractSegments(data: unknown): TranscriptionSegment[] {
    // Map upstream segment schema → TranscriptionSegment[]
    return [];
  }
}
```

### Conventions

| Convention                                                                                                       | Rationale                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Constructor takes `apiKey?` with env fallback                                                                    | Same as TTS; allows test injection                                                                                               |
| `isConfigured()` returns boolean                                                                                 | Surfaced via `STTProcessor.supports(name)`                                                                                       |
| `STTError` static factories (`audioEmpty`, `audioTooLong`, `providerNotConfigured`, `transcriptionFailed`, etc.) | Defined in `src/lib/voice/errors.ts:117-455`. Use these instead of constructing `STTError` manually                              |
| 30s `AbortController` on REST                                                                                    | Same convention as TTS handlers                                                                                                  |
| Streaming via WebSocket lives behind `transcribeStream`                                                          | Optional — set `supportsStreaming = false` if not implemented                                                                    |
| `confidence` mandatory in `STTResult`                                                                            | Whisper has no per-result confidence; convention is to fix at `0.95`. Document the source of the value in metadata               |
| `words[]` and `segments[]` optional                                                                              | Set when `options.wordTimestamps` or upstream returns them; consumers can render karaoke-style or speaker-attributed transcripts |

### Audio resolution

`STTOptions.audio` accepts `Buffer | string` (path) and the handler must resolve both. For URL-based audio, callers should fetch first — handlers don't need to be HTTP clients themselves. (This is a deliberate restriction; Deepgram's `prerecorded?url=` query option is bypassed in our wrapper to keep handler logic uniform.)

---

## Step 2 — Register in providerRegistry.ts

**File:** `src/lib/factories/providerRegistry.ts` — STT registration section (~line 550):

```typescript
try {
  const { STTProcessor } = await import("../utils/sttProcessor.js");
  const { <Name>STT } = await import("../voice/providers/<Name>STT.js");
  STTProcessor.registerHandler("<provider-name>", new <Name>STT());
} catch (err) {
  logger.debug(
    `[ProviderRegistry] <provider-name> STT registration skipped: ${err instanceof Error ? err.message : String(err)}`,
  );
}
```

The outer STT block already has its own try/catch around the four existing providers; nest the new one inside that block.

---

## Step 3 — Add barrel export

**File:** `src/lib/voice/index.ts`:

```diff
 // ============================================================================
 // STT PROVIDERS
 // ============================================================================
 ...
+export {
+  <Name>STT,
+  <Name>STT as <Name>STTHandler,
+} from "./providers/<Name>STT.js";
```

---

## Step 4 — Update VoiceProviderName

```diff
 export type VoiceProviderName =
   ...
   // STT providers
   | "deepgram"
   | "gladia"
   | "whisper"
   | "assemblyai"
   | "google-stt"
   | "azure-stt"
+  | "<provider-name>"
   // Realtime providers
   ...
```

---

## Step 5 — .env.example

```bash
# =============================================================================
# <PROVIDER> STT CONFIGURATION
# =============================================================================
<NAME>_API_KEY=
# Optional: override default model
# <NAME>_STT_MODEL=<model-id>
```

---

## Step 6 — Tests

In `test/continuous-test-suite-voice.ts`, add to the existing STT-Providers category. Test pattern:

```typescript
{
  category: "STT Providers",
  name: `<Provider> STT — generate() transcribes audio`,
  fn: async () => {
    if (!process.env.<NAME>_API_KEY) {
      logger.info("[skip] <NAME>_API_KEY not set");
      return true;
    }
    const audioBuffer = await fs.readFile("test/fixtures/test-audio.wav");
    const nl = new NeuroLink();
    const result = await nl.generate({
      provider: "<llm-provider>",
      stt: { enabled: true, audio: audioBuffer, provider: "<provider-name>" },
    });
    assert(result.transcription, "no transcription returned");
    assert(result.transcription.text.length > 0, "empty transcription");
    assert(typeof result.transcription.confidence === "number", "no confidence");
    return true;
  },
},
```

The voice suite has fixtures under `test/fixtures/`. If your provider has a unique audio format requirement, add a matching fixture.

### Audio-only request test

The STT preprocessing in `runStandardGenerateRequest` has different failure semantics depending on whether `prompt` / `input.text` is provided alongside the audio:

- **Audio-only** (no text): transcription failures fail-fast (`STTError` propagates)
- **Audio + text**: transcription failures are logged; `generate()` continues with un-augmented prompt

Test both paths.

---

## STT preprocessing in neurolink.ts

For reference (you don't need to modify this — it already handles new providers via the registry), the preprocessing flow in `src/lib/neurolink.ts:7700-7760` is:

```typescript
if (options.stt?.enabled && options.stt.audio) {
  const sttProvider = options.stt.provider ?? options.provider ?? "whisper";
  if (!STTProcessor.supports(sttProvider)) {
    throw STTError.providerNotSupported(sttProvider);
  }
  try {
    const sttResult = await STTProcessor.transcribe(
      options.stt.audio,
      sttProvider,
      options.stt,
    );
    // Inject transcription into prompt
    if (!options.prompt && !options.input?.text) {
      options.prompt = sttResult.text; // audio-only → transcription becomes prompt
    } else {
      const existing = options.prompt ?? options.input?.text ?? "";
      options.prompt = `[Transcribed audio]: ${sttResult.text}\n\n${existing}`;
    }
    transcription = sttResult; // attached to result later
  } catch (err) {
    if (!options.prompt && !options.input?.text) {
      throw err; // fail-fast for audio-only
    }
    logger.error(
      "STT preprocessing failed; continuing with un-augmented prompt",
      err,
    );
  }
}
```

This means **your handler doesn't need to know about the LLM call** — it just transcribes audio. The injection logic is centralised.

---

## Validation gates

```bash
pnpm run check && pnpm run lint && pnpm run build
pnpm run test:voice
# Real API smoke test:
export <NAME>_API_KEY=...
pnpm run cli generate --stt --stt-provider <provider-name> --input-audio recording.wav
```

---

## Common pitfalls

| Pitfall                                             | Fix                                                                                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Assumed `audio` is always `Buffer`                  | Handle the `string` (path) case; many tests pass paths                                                                           |
| Hardcoded sample rate 16 000                        | Modern providers want 24 000+ for quality; respect the upstream's preferred rate or detect from the audio                        |
| Missing word timestamps when `wordTimestamps: true` | Some providers require an extra param; the option is opt-in                                                                      |
| Used `confidence: 1.0` always                       | Whisper has no per-result confidence; convention is `0.95`. Other providers (Deepgram, AssemblyAI) return real values — use them |
| Did not handle `language: "auto"`                   | Some providers need an explicit code; `auto` should map to omitting the param                                                    |
| Forgot diarization mapping                          | If the upstream returns speakers, map to `TranscriptionSegment.speakerId`                                                        |
| Streaming WebSocket leaks on cancel                 | Pipe through an `AbortSignal` — see `DeepgramSTT.ts:435` for the cleanup pattern                                                 |

---

## See also

- [`14-voice-speech-integration.md`](14-voice-speech-integration.md) — full voice integration journal
- [`16-adding-tts-provider.md`](16-adding-tts-provider.md) — TTS modality (same pattern)
- `src/lib/voice/providers/DeepgramSTT.ts` — most thorough reference (REST + WebSocket + diarization)
- `src/lib/voice/providers/OpenAISTT.ts` — minimal reference (Whisper REST only)
