# 16 · Adding a New TTS Provider — Exhaustive Guide

This guide walks through adding a new Text-to-Speech provider (e.g., Fish Audio, Cartesia, Murf, PlayHT, Sarvam) to NeuroLink.

The pattern is established by `OpenAITTS`, `ElevenLabsTTS`, and `AzureTTS` shipped in commit `27a31c32`. Read [`14-voice-speech-integration.md`](14-voice-speech-integration.md) for the architectural rationale before this doc.

---

## TL;DR — The 6-file checklist

| #   | File                                    | Action | What changes                                                                                |
| --- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| 1   | `src/lib/voice/providers/<Name>TTS.ts`  | NEW    | Handler class implementing `TTSHandler`                                                     |
| 2   | `src/lib/factories/providerRegistry.ts` | EDIT   | Registration block in TTS section                                                           |
| 3   | `src/lib/voice/index.ts`                | EDIT   | Re-export the handler class                                                                 |
| 4   | `src/lib/types/voice.ts`                | EDIT   | Add to `VoiceProviderName` union; add `<Name>TTSOptions` if provider-specific options exist |
| 5   | `.env.example`                          | EDIT   | Document the API key env var                                                                |
| 6   | `test/continuous-test-suite-voice.ts`   | EDIT   | Add a test section                                                                          |

Plus optionally:

- `docs/getting-started/providers/<name>.md` — user-facing guide
- `docs/features/tts.md` — list the new provider in the "Supported providers" table
- `docs/reference/provider-comparison.md` — comparison table

**Total: 1 new file, 5–8 edits.**

---

## Architecture recap

```
nl.generate({ tts: { provider, voice, format } })
  ↓
BaseProvider.handleDirectTTSSynthesis()  // baseProvider.ts:886
  ↓
TTSProcessor.synthesize(text, provider, options)  // utils/ttsProcessor.ts:213
  ↓
handler = TTSProcessor.handlers.get(provider.toLowerCase())
  ↓
handler.synthesize(text, options): Promise<TTSResult>
```

`TTSProcessor` is a static `Map<string, TTSHandler>` populated by `registerHandler()` calls during `ProviderRegistry._doRegister()`.

The contract for a handler is in `src/lib/types/common.ts:482`:

```typescript
export type TTSHandler = {
  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;
  getVoices?(languageCode?: string): Promise<TTSVoice[]>;
  isConfigured(): boolean;
  maxTextLength?: number;
};
```

That's the entire interface. Implementing it gives you a NeuroLink TTS provider.

---

## Step 1 — Create the handler class

**File:** `src/lib/voice/providers/<Name>TTS.ts` — NEW.

Skeleton, modelled on `ElevenLabsTTS.ts`:

```typescript
/**
 * <Provider> Text-to-Speech Handler
 *
 * @module voice/providers/<Name>TTS
 * @see <provider docs URL>
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  TTSAudioFormat,
  TTSHandler,
  TTSOptions,
  TTSResult,
  TTSVoice,
  // Optional: provider-specific options type
  // <Name>TTSOptions,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

const DEFAULT_MAX_TEXT_LENGTH = 5000;
const REQUEST_TIMEOUT_MS = 30_000;

export class <Name>TTS implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.<provider>.com/v1";

  /** Maximum text length supported by the upstream API. */
  public readonly maxTextLength = DEFAULT_MAX_TEXT_LENGTH;

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.<NAME>_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "<Provider> API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // GET /voices, map upstream voice schema → TTSVoice[]
    // Filter by languageCode if provided.
    // Cache response (see ElevenLabsTTS.ts:32 for the 5-minute cache pattern).
    return [];
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "<Provider> API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const voiceId = options.voice ?? "<default-voice-id>";
    const requestedFormat = options.format ?? "mp3";
    const upstreamFormat = this.mapFormat(requestedFormat);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/synthesize`, {
        method: "POST",
        headers: {
          // Auth scheme varies per provider — pick the right one
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          format: upstreamFormat,
          speed: options.speed ?? 1.0,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `<Provider> TTS request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => Object.create(null) as Record<string, unknown>);
      const errorMessage =
        (errorData as { error?: { message?: string } }).error?.message ||
        `HTTP ${response.status}`;
      // Preserve HTTP status so the outer catch doesn't mark a permanent
      // 4xx (auth, bad input) as retriable and trigger pointless retry loops.
      const retriable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: errorMessage,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status, voiceId, upstreamFormat },
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const latency = Date.now() - startTime;

    // Use the *effective* output format (post-mapFormat fallback), not the
    // requested format — otherwise mp3-coerced "m4a" requests would mislabel
    // the buffer and break consumer file-extension routing.
    const effectiveFormat = this.effectiveFormat(upstreamFormat);

    const result: TTSResult = {
      buffer: audioBuffer,
      format: effectiveFormat,
      size: audioBuffer.length,
      voice: voiceId,
      sampleRate: this.getSampleRate(effectiveFormat),
      metadata: {
        latency,
        provider: "<provider-name>",
        requestedFormat: options.format,
        upstreamFormat,
      },
    };

    logger.info(
      `[<Name>TTS] Synthesized ${audioBuffer.length} bytes in ${latency}ms`,
    );

    return result;
  }

  /** Map canonical TTSAudioFormat → upstream format string. */
  private mapFormat(format: TTSAudioFormat): string {
    const formats: Partial<Record<TTSAudioFormat, string>> = {
      mp3: "mp3",
      wav: "wav",
      ogg: "ogg",
      opus: "opus",
    };
    const mapped = formats[format];
    if (!mapped) {
      logger.warn(
        `[<Name>TTS] Unsupported format "${format}" — falling back to mp3.`,
      );
      return "mp3";
    }
    return mapped;
  }

  /** Map upstream format string → canonical TTSAudioFormat (post-fallback). */
  private effectiveFormat(upstreamFormat: string): TTSAudioFormat {
    if (upstreamFormat.startsWith("mp3")) return "mp3";
    if (upstreamFormat.startsWith("wav")) return "wav";
    if (upstreamFormat.startsWith("ogg")) return "opus";
    if (upstreamFormat.startsWith("opus")) return "opus";
    if (upstreamFormat.startsWith("pcm")) return "pcm16"; // raw PCM, no header
    return "mp3";
  }

  private getSampleRate(format: TTSAudioFormat): number {
    switch (format) {
      case "opus":
      case "ogg":
        return 48_000;
      case "wav":
        return 44_100;
      default:
        return 24_000;
    }
  }
}
```

### Conventions

| Convention                                                | Rationale                                                                                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Constructor takes `apiKey?`** with env-var fallback     | Allows direct instantiation with explicit credentials; tests bypass env                                                                                                           |
| **`isConfigured()` returns boolean**                      | Used by `TTSProcessor.synthesize` to surface a clean configuration error before hitting the upstream                                                                              |
| **30s `AbortController` timeout**                         | Established convention across all 7 voice providers in commit `27a31c32` — the `TTSHandler` JSDoc mandates this in `common.ts:454`                                                |
| **Throw `TTSError` (not `Error`)**                        | Caller code branches on error category/severity/retriable; bare `Error` loses that signal                                                                                         |
| **Use `effectiveFormat`** to label `TTSResult.format`     | When `mapFormat` falls back to mp3, labelling the buffer as the _requested_ format breaks consumer file-extension routing (real bug fixed in CodeRabbit review during `27a31c32`) |
| **Map non-retriable HTTP statuses** to `retriable: false` | Without this, a 401 (bad API key) gets retried into rate-limit territory before failing — wasted upstream credits                                                                 |
| **Log success/failure** with `latency`                    | Operations need this signal for cost/latency dashboards                                                                                                                           |

### When the upstream uses raw PCM (no WAV header)

Some providers (OpenAI's `pcm` response, ElevenLabs `pcm_44100`) return raw 16-bit signed-LE samples with no RIFF/WAV container. Surface that as `format: "pcm16"` (one of the values in the `TTSAudioFormat` union) — labelling it `wav` will produce unplayable output when consumers write the buffer to a `.wav` file or feed it to a WAV parser. See `OpenAITTS.ts:293` for the canonical mapping.

### Provider-specific options

If your provider exposes options beyond the base `TTSOptions` (voice cloning, speaker boost, prosody markers, model variants), add them to `src/lib/types/voice.ts`:

```typescript
// src/lib/types/voice.ts
export type <Name>TTSOptions = TTSOptions & {
  model?: "<provider>-tts-fast" | "<provider>-tts-quality";
  stability?: number;
  similarityBoost?: number;
  // ... provider-specific extras
};
```

Inside `synthesize`:

```typescript
const providerOptions = options as <Name>TTSOptions;
const stability = providerOptions.stability ?? 0.5;
```

The cast is safe because the runtime accepts any object shape; TypeScript enforces shape only at the call site that uses the prefixed type. See `ElevenLabsTTSOptions` in `voice.ts:463-469` for the reference.

---

## Step 2 — Register in providerRegistry.ts

**File:** `src/lib/factories/providerRegistry.ts`.

Add inside the existing TTS-handler-registration section (around line 516, after the AzureTTS block):

```typescript
try {
  const { TTSProcessor } = await import("../utils/ttsProcessor.js");
  const { <Name>TTS } = await import("../voice/providers/<Name>TTS.js");
  TTSProcessor.registerHandler("<provider-name>", new <Name>TTS());
  // If you want aliases:
  // TTSProcessor.registerHandler("<alias>", new <Name>TTS()); // share instance
} catch (err) {
  logger.debug(
    `[ProviderRegistry] <provider-name> registration skipped: ${err instanceof Error ? err.message : String(err)}`,
  );
}
```

**Why a separate try/catch per handler?** A missing API key or a broken import for one provider must NOT prevent others from registering. The voice integration (commit `27a31c32`) explicitly architected this fault-tolerance because all voice providers are optional — `TTSProcessor.supports("<name>")` is the runtime gate, not registration success.

**Why `logger.debug` instead of `warn`?** Most TTS providers will be unconfigured for any given user. Spamming WARN for every missing provider creates log noise. The `realtime` block uses `logger.error` for failures because realtime is fewer providers and each one being missing is more notable.

---

## Step 3 — Add barrel export

**File:** `src/lib/voice/index.ts`.

```diff
 // ============================================================================
 // TTS PROVIDERS
 // ============================================================================

 export { AzureTTS, AzureTTS as AzureTTSHandler } from "./providers/AzureTTS.js";
 export {
   ElevenLabsTTS,
   ElevenLabsTTS as ElevenLabsTTSHandler,
 } from "./providers/ElevenLabsTTS.js";
 export {
   OpenAITTS,
   OpenAITTS as OpenAITTSHandler,
 } from "./providers/OpenAITTS.js";
+export {
+  <Name>TTS,
+  <Name>TTS as <Name>TTSHandler,
+} from "./providers/<Name>TTS.js";
```

The `as <Name>TTSHandler` alias is convention — every TTS provider exports both the class name and a `<Class>Handler` alias for ergonomics in caller code that prefers explicit handler suffixes.

---

## Step 4 — Update VoiceProviderName

**File:** `src/lib/types/voice.ts:43-63`.

```diff
 export type VoiceProviderName =
   // TTS providers
   | "google-tts"
   | "elevenlabs"
   | "openai-tts"
   | "azure-tts"
+  | "<provider-name>"
   | "sarvam"
   ...
```

The `VoiceProviderName` union is referenced by `VoiceProviderConfig`, telemetry tagging, and CLI choice validation. Forgetting this addition produces a TypeScript error in any caller that uses the union for routing.

If you added `<Name>TTSOptions`, it lives in this same file — append after the existing provider-specific option types.

---

## Step 5 — Update .env.example

```bash
# =============================================================================
# <PROVIDER> TTS CONFIGURATION
# =============================================================================
<NAME>_API_KEY=
# Optional: override default voice
# <NAME>_DEFAULT_VOICE=<voice-id>
```

For Azure-style providers that need a region:

```bash
<NAME>_API_KEY=
<NAME>_REGION=eastus
```

---

## Step 6 — Tests

**File:** `test/continuous-test-suite-voice.ts` (1 822 lines, post-`27a31c32`).

The suite has 15 test items covering all TTS providers via the consumer API. Add a new section that mirrors the existing TTS provider blocks. The pattern (from the existing suite):

```typescript
{
  category: "TTS Providers",
  name: `<Provider> TTS — generate() returns valid mp3`,
  fn: async () => {
    const env = process.env.<NAME>_API_KEY;
    if (!env) {
      logger.info(`[skip] <NAME>_API_KEY not set — skipping <provider> tests`);
      return true; // skip-gracefully convention
    }
    const nl = new NeuroLink({ /* ... */ });
    const result = await nl.generate({
      provider: "<llm-provider>", // any LLM, the TTS is plumbed regardless
      input: { text: "Test phrase" },
      tts: { enabled: true, provider: "<provider-name>", format: "mp3" },
    });
    assert(result.audio?.buffer.length > 1000, "audio buffer too small");
    assert(result.audio?.format === "mp3", "wrong format");
    // Validate MP3 magic bytes (0xFF 0xFB or "ID3")
    const head = result.audio.buffer.subarray(0, 3);
    assert(
      (head[0] === 0xFF && (head[1] & 0xE0) === 0xE0) ||
      (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33),
      "not a valid MP3",
    );
    return true;
  },
},
```

Optionally also add:

- A negative test: handler returns the right error when API key is missing/invalid.
- A streaming test if the handler implements `synthesizeStream`.
- A round-trip test: STT → LLM → your TTS provider, validates end-to-end audio pipeline (see existing test #5 for the round-trip pattern).

---

## CLI integration

The CLI surfaces TTS via `--tts --tts-provider <name>` (added in commit `27a31c32`, `commandFactory.ts:177` block). The `--tts-provider` flag is a **closed choices list** — yargs rejects any value not in the `choices:` array. You must add your provider's registered name to the list in `src/cli/factories/commandFactory.ts`:

```diff
 ttsProvider: {
   type: "string" as const,
   choices: [
     "google-ai", "vertex", "openai-tts", "elevenlabs", "azure-tts",
+    "<provider-name>",
   ],
   description: "TTS provider (overrides --provider for speech synthesis)",
 },
```

Without this change, passing `--tts-provider <provider-name>` will fail with a yargs validation error before the handler is ever called. Runtime registration alone is not sufficient.

---

## Documentation

### `docs/getting-started/providers/<name>.md` — NEW

Use `docs/getting-started/providers/elevenlabs.md` as the template (the most thorough TTS doc). Required sections:

1. Frontmatter
2. Overview — what's distinctive about this provider (price, latency, voice cloning, language coverage)
3. Quick Start — get key, configure, first synthesis
4. Voice Catalog — how to list voices (link to provider's voice library)
5. SDK Usage — TTS-only, TTS-with-LLM, streaming
6. CLI Usage — `--tts --tts-provider <name>` examples
7. Provider-specific options — if any (`<Name>TTSOptions`)
8. Audio formats — table mapping the canonical `TTSAudioFormat` to upstream values
9. Configuration Reference — env vars
10. Troubleshooting

### `docs/features/tts.md` — UPDATE

Add a row to the supported-providers table.

### `docs/reference/provider-comparison.md` — UPDATE

Add to the TTS section.

### `docs/getting-started/providers/index.md` — UPDATE

Add a card.

---

## Validation gates

```bash
pnpm run check
pnpm run lint
pnpm run build
pnpm run test:tts        # if a dedicated TTS suite exists
pnpm run test:voice      # alias for the voice suite
# Real API smoke test:
export <NAME>_API_KEY=...
pnpm run cli generate "Hello world" --tts --tts-provider <provider-name>
```

If lint complains about `unique-type-names` for `<Name>TTSOptions`, your prefix is colliding — search the types folder for the colliding name and add a more specific prefix.

---

## Common pitfalls

| Pitfall                                 | Fix                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Forgot to add to `VoiceProviderName`    | Caller code that types `VoiceProviderName` won't accept your new string. Symptom: TS error at call sites.         |
| Static (not dynamic) import in registry | Circular-dependency error on first import of NeuroLink. Always `await import(...)` inside the registration block. |
| Threw `Error` instead of `TTSError`     | Loses category/severity/retriable signal; outer error handlers can't classify the error.                          |
| Returned `format: requestedFormat`      | When `mapFormat` falls back, the labelled format lies — file-extension routing breaks. Use `effectiveFormat`.     |
| Forgot `AbortController` timeout        | Hung requests block the whole `generate()` call indefinitely. The TTSHandler JSDoc mandates 30s.                  |
| Marked 4xx errors as `retriable: true`  | Wastes upstream credits on retries that will never succeed. Branch on HTTP status.                                |
| Cached voice list without TTL           | Stale data when provider adds new voices. The 5-minute TTL pattern in `ElevenLabsTTS.ts:33` is the convention.    |
| Logged at `warn` for unconfigured       | Most users don't configure most TTS providers. Use `debug`.                                                       |

---

## Edge cases that may need new processor capability

If your provider:

- **Streams audio chunks natively** (Cartesia, Eleven Labs WebSocket): implement `synthesizeStream` on the handler. Consumers iterate chunks. The processor doesn't need changes — `TTSStreamChunk` is already in the type system.
- **Doesn't return audio** (some providers return a job ID and a callback URL): the processor pattern fits awkwardly. Either poll synchronously inside `synthesize` and return the final buffer, or expose a separate async API. Discuss with maintainers before implementing.
- **Requires SSML** (Azure): build SSML inside `synthesize` from `text` + `voice` + `speed` + `pitch`. See `AzureTTS.ts:227` for the SSML construction pattern. Provide a `ssmlTemplate` option for callers who want to bypass auto-SSML.
- **Has a "Voice Cloning" endpoint**: this is a pre-step (upload a reference, get a `voice_id`). Decide whether to model it as part of the handler (a new method like `cloneVoice(referenceAudio): Promise<string>`) or as a separate utility. ElevenLabs models it as a separate API; we don't expose it through the handler today.

---

## See also

- [`14-voice-speech-integration.md`](14-voice-speech-integration.md) — full voice integration journal (3 TTS + 4 STT + 2 realtime providers shipped together)
- [`17-adding-stt-provider.md`](17-adding-stt-provider.md) — same pattern for STT
- [`18-adding-realtime-provider.md`](18-adding-realtime-provider.md) — bidirectional voice
- [`CHECKLIST.md`](CHECKLIST.md) — pasteable PR checklist
- `src/lib/voice/providers/ElevenLabsTTS.ts` — the canonical reference implementation
