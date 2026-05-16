# 21 · Adding a New Modality (Avatar, Music, etc.) — Exhaustive Guide

This guide covers introducing an **entirely new modality category** to NeuroLink — one that doesn't fit into existing slots (LLM chat, TTS, STT, Realtime, video, image-gen).

Concrete examples this guide enables:

- **Avatar / Lip-sync** (D-ID, Synthesia, MuseTalk via Replicate, HeyGen)
- **Music generation** (Suno, Udio, Beatoven, ElevenLabs Music, Lyria)
- **3D generation** (Tripo, Meshy, Rodin) — speculative
- **Sound effects** (ElevenLabs SFX, Stable Audio) — speculative

The pattern follows what TTS / STT / Realtime did in commit `27a31c32` and what §A of [`19-adding-video-provider.md`](19-adding-video-provider.md) extracts.

> **When to use this guide:** when no existing modality / processor is a good home for the new capability. If you're tempted to put a music generator into `TTSProcessor` or a 3D model into the image-gen pathway, stop and use this guide instead.

---

## The 11-step pattern

Each new modality requires:

1. **Type file** — `src/lib/types/<modality>.ts` (the `<Modality>Handler` interface, `<Modality>Options`, `<Modality>Result`)
2. **Processor utility** — `src/lib/utils/<modality>Processor.ts` (registry + dispatch)
3. **Module directory** — `src/lib/<modality>/providers/` (handler classes)
4. **`output.mode` extension** — add the new mode value to the union in `src/lib/types/generate.ts`
5. **`output.<modality>` config block** — options shape under the output block
6. **Result block** — `result.<modality>` field for output payloads
7. **Dispatcher in `baseProvider.ts`** — route `output.mode === "<modality>"` to a new handler method
8. **Registration in `providerRegistry.ts`** — register first-party handlers
9. **CLI surface** — extend `output-mode` choice + new flags
10. **Test suite** — `test/continuous-test-suite-<modality>.ts` + `test:<modality>` script
11. **Documentation** — feature page, getting-started directory, provider-integration journal

---

## Worked example: Avatar / Lip-sync

This walkthrough adds the **Avatar** modality (D-ID as the first handler). Substitute "Avatar" → "Music" / "Audio" / "ThreeD" as needed.

### Step 1 — Type file

**File:** `src/lib/types/avatar.ts` — NEW.

```typescript
/**
 * Avatar / Lip-sync Type Definitions
 *
 * Types for generating talking-head videos by combining a portrait image
 * with narration audio (or text + TTS provider).
 *
 * @module types/avatar
 */

import type { TTSAudioFormat } from "./tts.js";

/**
 * Output formats for avatar videos.
 */
export type AvatarVideoFormat = "mp4" | "webm" | "mov";

/**
 * Quality presets for avatar generation. Provider-specific mappings:
 * - D-ID: "standard" → 720p, "hd" → 1080p
 * - HeyGen: "standard" → 720p, "hd" → 1080p with enhancement
 * - MuseTalk (Replicate): single quality only; "hd" is no-op
 */
export type AvatarQuality = "standard" | "hd";

/**
 * Options for avatar video generation.
 */
export type AvatarOptions = {
  /** Source portrait image (Buffer or absolute file path) */
  image: Buffer | string;

  /**
   * Audio source. Either:
   * - Pre-recorded narration (Buffer or path) — direct lip-sync
   * - Text — handler must produce TTS first using `ttsProvider`
   */
  audio?: Buffer | string;
  text?: string;

  /** TTS provider when `text` is provided (default: "openai-tts") */
  ttsProvider?: string;
  /** Voice id passed through to the TTS provider */
  voice?: string;

  /** Avatar provider override */
  provider?: string;
  /** Output quality */
  quality?: AvatarQuality;
  /** Output format (default: "mp4") */
  format?: AvatarVideoFormat;
  /** Output file path (optional — if omitted, buffer is returned in result) */
  output?: string;
  /** Provider-specific options (cast to <Provider>AvatarOptions inside handlers) */
  [k: string]: unknown;
};

/**
 * Result of avatar generation.
 */
export type AvatarResult = {
  /** Generated video buffer */
  buffer: Buffer;
  /** Output format */
  format: AvatarVideoFormat;
  /** File size in bytes */
  size: number;
  /** Duration in seconds (if known) */
  duration?: number;
  /** Provider used */
  provider?: string;
  /** Performance metadata */
  metadata?: {
    latency: number;
    provider?: string;
    model?: string;
    [k: string]: unknown;
  };
};

/**
 * Handler contract for avatar generation providers.
 */
export type AvatarHandler = {
  /**
   * Generate a talking-head video.
   * Implementations enforce their own timeouts (recommended: 5 minutes).
   */
  generate(options: AvatarOptions): Promise<AvatarResult>;

  /** Validate the provider is configured (auth, base URL, etc.). */
  isConfigured(): boolean;

  /** Maximum supported audio length in seconds (provider-specific). */
  readonly maxAudioDurationSeconds?: number;

  /** Supported output formats. */
  readonly supportedFormats?: AvatarVideoFormat[];
};
```

**CLAUDE.md compliance:**

- Rule 7 — uses `type` not `interface` ✓
- Rule 8 — file is `avatar.ts` not `avatarTypes.ts` ✓
- Rule 9 — types prefixed `Avatar*` (globally unique) ✓
- Rule 11 — lives in `src/lib/types/`, not a local types directory ✓

Add to `src/lib/types/index.ts`: `export * from "./avatar.js";` (rule 10 — barrel-only).

### Step 2 — Processor utility

**File:** `src/lib/utils/avatarProcessor.ts` — NEW.

Mirror `src/lib/utils/ttsProcessor.ts:75-352`. The shape is identical; substitute names:

```typescript
import { logger } from "./logger.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { NeuroLinkError } from "./errorHandling.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../observability/index.js";
import type {
  AvatarHandler,
  AvatarOptions,
  AvatarResult,
} from "../types/index.js";

export const AVATAR_ERROR_CODES = {
  PROVIDER_NOT_SUPPORTED: "AVATAR_PROVIDER_NOT_SUPPORTED",
  PROVIDER_NOT_CONFIGURED: "AVATAR_PROVIDER_NOT_CONFIGURED",
  GENERATION_FAILED: "AVATAR_GENERATION_FAILED",
  POLL_TIMEOUT: "AVATAR_POLL_TIMEOUT",
  INVALID_INPUT: "AVATAR_INVALID_INPUT",
  AUDIO_TOO_LONG: "AVATAR_AUDIO_TOO_LONG",
} as const;

export class AvatarError extends NeuroLinkError {
  constructor(opts: {
    code: string;
    message: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    retriable?: boolean;
    context?: Record<string, unknown>;
    originalError?: Error;
  }) {
    super({
      code: opts.code,
      message: opts.message,
      category: opts.category ?? ErrorCategory.EXECUTION,
      severity: opts.severity ?? ErrorSeverity.HIGH,
      retriable: opts.retriable ?? false,
      context: opts.context,
      originalError: opts.originalError,
    });
    this.name = "AvatarError";
  }
}

export class AvatarProcessor {
  private static readonly handlers = new Map<string, AvatarHandler>();

  static registerHandler(providerName: string, handler: AvatarHandler): void {
    if (!providerName) throw new Error("Provider name required");
    if (!handler) throw new Error("Handler required");
    const key = providerName.toLowerCase();
    if (this.handlers.has(key)) {
      logger.warn(`[AvatarProcessor] Overwriting handler for: ${key}`);
    }
    this.handlers.set(key, handler);
    logger.debug(`[AvatarProcessor] Registered: ${key}`);
  }

  static supports(providerName: string): boolean {
    return providerName ? this.handlers.has(providerName.toLowerCase()) : false;
  }

  private static getHandler(providerName: string): AvatarHandler | undefined {
    return this.handlers.get(providerName.toLowerCase());
  }

  static async generate(
    provider: string,
    options: AvatarOptions,
  ): Promise<AvatarResult> {
    const span = SpanSerializer.createSpan(SpanType.AVATAR, "avatar.generate", {
      "avatar.provider": provider,
      "avatar.quality": options.quality,
      "avatar.format": options.format,
    });
    try {
      const handler = this.getHandler(provider);
      if (!handler) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
          message: `Avatar provider "${provider}" is not registered. Available: ${Array.from(this.handlers.keys()).join(", ")}`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
        });
      }
      if (!handler.isConfigured()) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
          message: `Avatar provider "${provider}" is not configured`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
        });
      }
      const result = await handler.generate(options);
      const ended = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(ended);
      return result;
    } catch (err) {
      const ended = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(ended);
      throw err;
    }
  }
}
```

Add `SpanType.AVATAR` to `src/lib/types/span.ts` so observability surfaces avatar operations as a distinct span category (mirrors what `27a31c32` did for `SpanType.STT`).

### Step 3 — Module directory + first handler

**Directory:** `src/lib/avatar/` — NEW.

```
src/lib/avatar/
├── index.ts                      # Barrel re-exports
└── providers/
    ├── DIDAvatar.ts              # First handler implementation
    └── (future: HeyGenAvatar.ts, ReplicateAvatar.ts, etc.)
```

**File:** `src/lib/avatar/providers/DIDAvatar.ts` — NEW.

Skeleton:

```typescript
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import {
  AVATAR_ERROR_CODES,
  AvatarError,
} from "../../utils/avatarProcessor.js";
import type {
  AvatarHandler,
  AvatarOptions,
  AvatarResult,
  AvatarVideoFormat,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

const DEFAULT_BASE_URL = "https://api.d-id.com";
const POLL_INTERVAL_MS = 3_000;
const TOTAL_TIMEOUT_MS = 5 * 60_000;

export class DIDAvatar implements AvatarHandler {
  public readonly maxAudioDurationSeconds = 60;
  public readonly supportedFormats: AvatarVideoFormat[] = ["mp4"];

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = (apiKey ?? process.env.D_ID_API_KEY ?? "").trim() || null;
    this.baseUrl = process.env.D_ID_BASE_URL ?? DEFAULT_BASE_URL;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(options: AvatarOptions): Promise<AvatarResult> {
    if (!this.apiKey) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "D_ID_API_KEY not set",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const sourceUrl = await this.uploadImage(options.image);
    const audioUrl = options.audio
      ? await this.uploadAudio(options.audio)
      : undefined;

    // POST /talks
    const submitResp = await fetch(`${this.baseUrl}/talks`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: sourceUrl,
        script: audioUrl
          ? { type: "audio", audio_url: audioUrl }
          : {
              type: "text",
              input: options.text,
              provider: {
                type: "microsoft",
                voice_id: options.voice ?? "en-US-JennyNeural",
              },
            },
      }),
    });

    if (!submitResp.ok) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `D-ID submit failed: ${submitResp.status} ${await submitResp.text()}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: submitResp.status >= 500,
      });
    }

    const { id } = await submitResp.json();
    const videoBuffer = await this.pollUntilComplete(id, startTime);

    return {
      buffer: videoBuffer,
      format: "mp4",
      size: videoBuffer.length,
      provider: "d-id",
      metadata: {
        latency: Date.now() - startTime,
        provider: "d-id",
        talkId: id,
      },
    };
  }

  private async pollUntilComplete(
    id: string,
    startTime: number,
  ): Promise<Buffer> {
    while (Date.now() - startTime < TOTAL_TIMEOUT_MS) {
      const statusResp = await fetch(`${this.baseUrl}/talks/${id}`, {
        headers: { Authorization: `Basic ${this.apiKey}` },
      });
      const data = await statusResp.json();
      if (data.status === "done") {
        const dl = await fetch(data.result_url);
        return Buffer.from(await dl.arrayBuffer());
      }
      if (data.status === "error") {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.GENERATION_FAILED,
          message: `D-ID generation failed: ${data.error?.description ?? "unknown"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
        });
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new AvatarError({
      code: AVATAR_ERROR_CODES.POLL_TIMEOUT,
      message: `D-ID talk ${id} did not complete within ${TOTAL_TIMEOUT_MS / 1000}s`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retriable: true,
    });
  }

  private async uploadImage(image: Buffer | string): Promise<string> {
    // POST /images, returns { url }
    // Accept Buffer or path
    // ... (see real impl pattern)
    return "https://...";
  }

  private async uploadAudio(audio: Buffer | string): Promise<string> {
    // POST /audios, returns { url }
    return "https://...";
  }
}
```

**File:** `src/lib/avatar/index.ts` — NEW.

```typescript
export {
  DIDAvatar,
  DIDAvatar as DIDAvatarHandler,
} from "./providers/DIDAvatar.js";
// Re-export the processor for caller convenience
export {
  AvatarProcessor,
  AvatarError,
  AVATAR_ERROR_CODES,
} from "../utils/avatarProcessor.js";
```

### Step 4 — Extend `output.mode`

**File:** `src/lib/types/generate.ts`. Two locations (rules 100, 855 — both `GenerateOptions` shapes):

```diff
-    mode?: "text" | "video" | "ppt";
+    mode?: "text" | "video" | "ppt" | "avatar";
```

The `output.mode` union appears twice in this file (one in input options, one in result types). Update both. CLAUDE.md rule 5 mandates this be additive — never remove existing values.

### Step 5 — `output.avatar` config block

In the same file, add the per-mode config:

```typescript
export type GenerateOptions = {
  // ... existing ...
  output?: {
    mode?: "text" | "video" | "ppt" | "avatar";
    format?: "json" | "structured" | "text" | "binary";
    video?: VideoOutputOptions;
    ppt?: PptOutputOptions;
+   avatar?: AvatarOptions; // imported from "./avatar.js"
  };
};
```

### Step 6 — `result.avatar` field

```typescript
export type GenerateResult = {
  // ... existing ...
+ avatar?: AvatarResult;
  video?: VideoGenerationResult;
  ppt?: PptResult;
};
```

### Step 7 — Dispatcher in `baseProvider.ts`

**File:** `src/lib/core/baseProvider.ts:815`. Add an `if` branch alongside the existing video / ppt routing:

```diff
 try {
   if (options.output?.mode === "video") {
     return await this.handleVideoGeneration(options, startTime);
   }
+  if (options.output?.mode === "avatar") {
+    return await this.handleAvatarGeneration(options, startTime);
+  }
+  if (options.output?.mode === "ppt") {
+    return await this.handlePptGeneration(options, startTime);
+  }
   ...
```

Add the method (mirror `handleVideoGeneration` at line 1750):

```typescript
private async handleAvatarGeneration(
  options: TextGenerationOptions,
  startTime: number,
): Promise<EnhancedGenerateResult> {
  const { AvatarProcessor, AvatarError, AVATAR_ERROR_CODES } =
    await import("../utils/avatarProcessor.js");

  const provider = options.output?.avatar?.provider ?? "d-id";
  const avatarOpts = options.output?.avatar;

  if (!avatarOpts) {
    throw new AvatarError({
      code: AVATAR_ERROR_CODES.INVALID_INPUT,
      message: "output.avatar config is required when output.mode is 'avatar'",
      retriable: false,
    });
  }

  // Resolve image (Buffer | path | URL handling, same as handleVideoGeneration)
  const imageBuffer = await this.resolveImage(avatarOpts.image);

  // Resolve audio: either provided directly or generated via TTS-then-pass
  let audioBuffer: Buffer | undefined;
  if (avatarOpts.audio) {
    audioBuffer = await this.resolveAudio(avatarOpts.audio);
  } else if (avatarOpts.text) {
    const { TTSProcessor } = await import("../utils/ttsProcessor.js");
    const ttsResult = await TTSProcessor.synthesize(
      avatarOpts.text,
      avatarOpts.ttsProvider ?? "openai-tts",
      { format: "mp3", voice: avatarOpts.voice },
    );
    audioBuffer = ttsResult.buffer;
  }

  const result = await AvatarProcessor.generate(provider, {
    ...avatarOpts,
    image: imageBuffer,
    audio: audioBuffer,
  });

  const baseResult: EnhancedGenerateResult = {
    content: avatarOpts.text ?? "",
    provider,
    model: provider, // avatar providers don't have separate model names
    usage: { input: 0, output: 0, total: 0 },
    avatar: result,
  };

  return await this.enhanceResult(baseResult, options, startTime);
}
```

### Step 8 — Registration in `providerRegistry.ts`

After the existing voice / video registration blocks (~line 670):

```typescript
// ===== AVATAR HANDLER REGISTRATION =====
try {
  const { AvatarProcessor } = await import("../utils/avatarProcessor.js");
  const { DIDAvatar } = await import("../avatar/providers/DIDAvatar.js");
  AvatarProcessor.registerHandler("d-id", new DIDAvatar());
  logger.debug("Avatar handlers registered: d-id");
} catch (err) {
  logger.warn(
    `[ProviderRegistry] d-id avatar registration failed: ${err instanceof Error ? err.message : String(err)}`,
  );
}
```

The block is wrapped in its own try/catch — same fault-tolerance contract as voice. Future avatar handlers (HeyGen, MuseTalk via Replicate) add another `try { ... } catch {}` inside this block.

### Step 9 — CLI surface

**File:** `src/cli/factories/commandFactory.ts`. Two edits:

```diff
 // Output mode help text (line ~393)
- "Output mode: 'text' for standard generation, 'video' for video, 'ppt' for presentation",
+ "Output mode: 'text' for standard generation, 'video' for video, 'ppt' for presentation, 'avatar' for talking-head video",

 // Output mode dispatch (line ~2450)
+ if (argv.outputMode === "avatar") {
+   options.output = {
+     mode: "avatar" as const,
+     avatar: {
+       provider: argv.avatarProvider,
+       image: argv.avatarImage,
+       audio: argv.avatarAudio,
+       text: argv.avatarText,
+       voice: argv.avatarVoice,
+       quality: argv.avatarQuality,
+       format: argv.avatarFormat,
+     },
+   };
+ }
```

Add CLI flags to the option schema (around the existing `--output-mode` section):

```typescript
"avatar-provider": {
  type: "string",
  description: "Avatar provider (d-id, replicate, heygen)",
},
"avatar-image": {
  type: "string",
  description: "Path to source portrait image",
},
"avatar-audio": {
  type: "string",
  description: "Path to narration audio (alternative to --avatar-text)",
},
"avatar-text": {
  type: "string",
  description: "Text for the avatar to speak (uses TTS internally)",
},
"avatar-voice": {
  type: "string",
  description: "TTS voice id when --avatar-text is used",
},
"avatar-quality": {
  type: "string",
  choices: ["standard", "hd"],
  description: "Avatar video quality",
},
```

### Step 10 — Test suite

**File:** `test/continuous-test-suite-avatar.ts` — NEW. Mirror `test/continuous-test-suite-voice.ts` shape:

```typescript
import { NeuroLink } from "../src/lib/index.js";
import { logger } from "../src/lib/utils/logger.js";
import * as fs from "node:fs/promises";

const tests = [
  {
    category: "Avatar — D-ID",
    name: "generate() produces talking-head video from image + audio",
    fn: async () => {
      if (!process.env.D_ID_API_KEY) return true;
      const image = await fs.readFile("test/fixtures/portrait.jpg");
      const audio = await fs.readFile("test/fixtures/narration.mp3");
      const nl = new NeuroLink();
      const result = await nl.generate({
        provider: "vertex", // any LLM, not used for avatar mode
        output: {
          mode: "avatar",
          avatar: { provider: "d-id", image, audio, format: "mp4" },
        },
      });
      if (!result.avatar?.buffer) return false;
      // Validate MP4 magic bytes (ftyp at offset 4)
      return result.avatar.buffer.subarray(4, 8).toString() === "ftyp";
    },
  },
  // ... text-driven, registration check, error case, etc.
];

// Boilerplate runner — copy from continuous-test-suite-voice.ts
```

**File:** `package.json` — add `test:avatar` script:

```diff
 "test:voice": "npx tsx test/continuous-test-suite-voice.ts",
+"test:avatar": "npx tsx test/continuous-test-suite-avatar.ts",
```

### Step 11 — Documentation

#### `docs/features/avatar.md` — NEW

Use `docs/features/tts.md` as the template. Sections:

1. Overview — what avatar generation is, when to use it
2. Quick Start — D-ID minimal example
3. Supported Providers — table (D-ID, future HeyGen, MuseTalk)
4. Input Options — image source (path/URL/Buffer), audio sources (direct vs TTS)
5. Output Formats — mp4, webm, mov per provider
6. Quality Tiers — standard / hd mappings per provider
7. Streaming — note that avatar is async-only (no streaming)
8. Pricing reference

#### `docs/getting-started/providers/d-id.md` — NEW

Per-provider guide. Same template as `elevenlabs.md`.

#### `docs/provider-integration/<NN>-avatar-integration.md` — NEW (optional implementation journal)

For non-trivial work, document the architectural decisions, the wire format, edge cases. Use `14-voice-speech-integration.md` as the template.

#### Cross-reference updates

| File                                      | Update                   |
| ----------------------------------------- | ------------------------ |
| `docs/features/index.md`                  | Add an "Avatar" link     |
| `docs/getting-started/providers/index.md` | Add the new providers    |
| `docs/reference/provider-comparison.md`   | Add an Avatar section    |
| `README.md`                               | Mention the new modality |
| `docs-site/sidebars.ts`                   | Add the new pages        |

---

## Generic shape — Music modality (for reference)

Substitute "Avatar" → "Music" / "Audio" / "Music3D" in every step.

The Music modality differs from Avatar in two ways:

1. **No image input** — `MusicOptions` takes `prompt` (text) and optional `referenceAudio` (Buffer).
2. **Variable output length** — `MusicResult.duration` is the practical maximum, providers can return 30s–5min depending on subscription.

Concrete handlers to add (in priority order):

| Handler                                                         | API                                                                                   | Notes                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Beatoven (`src/lib/music/providers/BeatovenMusic.ts`)           | `https://public-api.beatoven.ai`                                                      | Async track gen + composition; complex auth                                       |
| ElevenLabs Music (`src/lib/music/providers/ElevenLabsMusic.ts`) | `https://api.elevenlabs.io/v1/sound-generation`                                       | Distinct from ElevenLabs **TTS** — different endpoint, different account billing. |
| Lyria 3 Pro (`src/lib/music/providers/LyriaMusic.ts`)           | `https://generativelanguage.googleapis.com/v1beta/models/lyria-3-pro:generateContent` | Google Generative AI — auth via API key                                           |
| Suno (`src/lib/music/providers/SunoMusic.ts`)                   | (no public API yet — speculative)                                                     |                                                                                   |
| Udio (`src/lib/music/providers/UdioMusic.ts`)                   | (no public API yet — speculative)                                                     |                                                                                   |

The ElevenLabs Music endpoint is **distinct from** the ElevenLabs TTS endpoint. Naming: `ElevenLabsMusic` (in `src/lib/music/providers/`) vs `ElevenLabsTTS` (in `src/lib/voice/providers/`). The two share an `ELEVENLABS_API_KEY` env var (one ElevenLabs account); the handlers are independent.

---

## Type-naming conflicts to avoid (CLAUDE.md rule 9)

Globally unique type names with domain prefixes are enforced by the `unique-type-names` ESLint rule. For Avatar:

| Don't use     | Use instead         | Reason                                                           |
| ------------- | ------------------- | ---------------------------------------------------------------- |
| `Options`     | `AvatarOptions`     | Bare `Options` collides everywhere                               |
| `Handler`     | `AvatarHandler`     | Conflicts with `TTSHandler`, `STTHandler`, `VideoHandler`        |
| `Result`      | `AvatarResult`      | Conflicts with `TTSResult`, `STTResult`, `VideoGenerationResult` |
| `VideoFormat` | `AvatarVideoFormat` | Conflicts with potential video-only `VideoFormat`                |
| `Quality`     | `AvatarQuality`     | Conflicts with `TTSQuality`                                      |

For Music: `MusicOptions`, `MusicHandler`, `MusicResult`, `MusicFormat`, `MusicGenre`, etc.

---

## Validation gates

```bash
pnpm run check
pnpm run lint
pnpm run build
pnpm run test:avatar    # the new modality test suite
pnpm run test:providers # cross-modality sanity
# Real API smoke test:
export D_ID_API_KEY=...
pnpm run cli generate --output-mode avatar \
  --avatar-provider d-id --avatar-image portrait.jpg --avatar-text "Hello world"
```

---

## Common pitfalls

| Pitfall                                                                       | Fix                                                                                                                   |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Tried to put Avatar in `TTSProcessor` because it produces audio-driven output | TTS is text → audio. Avatar is image + audio → video. Separate processor.                                             |
| Tried to put Music in `TTSProcessor` because it produces audio                | TTS is voiced speech with prosody. Music is melodic / harmonic content. Separate processor.                           |
| Forgot to add `SpanType.<MODALITY>`                                           | Observability dashboards lose the new modality category                                                               |
| Bare `Options`, `Handler`, `Result` type names                                | ESLint `unique-type-names` rule fails the build                                                                       |
| Created `src/lib/avatar/types/` instead of `src/lib/types/avatar.ts`          | ESLint `no-local-types-folder` rule fails                                                                             |
| Removed an existing `output.mode` value                                       | Public API break (CLAUDE.md rule 5). Always additive.                                                                 |
| Forgot the second `output.mode` location in `generate.ts`                     | Type checking passes; runtime dispatch silently falls through to `text` mode                                          |
| Did not implement TTS-pass-through for `text → audio → avatar`                | Caller must always provide pre-recorded audio; TTS-driven avatar generation requires the chain (TTS → audio → avatar) |
| Did not document in `docs/features/index.md`                                  | Modality is invisible to discovery; users won't find it                                                               |
| Did not add to `provider-comparison.md`                                       | Decision-making docs stale immediately                                                                                |

---

## When to NOT add a new modality

If the new capability:

- **Maps to an existing modality with a different transport** (e.g., a new TTS provider) → use the existing modality guide ([`16`](16-adding-tts-provider.md) etc.)
- **Is a tool, not a modality** (e.g., a search-knowledge-base tool, a code-execution tool) → use custom tools (`docs/sdk-custom-tools.md`)
- **Is a transformation of existing output** (e.g., subtitle burning on video) → ffmpeg pipeline / utility module under `src/lib/adapters/<modality>/`
- **Is one-off and unlikely to have multiple providers** → custom tool or service module, not a full modality category

A new modality is justified when:

- ≥2 providers in the space (so the registry pays for itself)
- Distinct input/output shape from existing modalities
- Caller-facing config that doesn't fit an existing `output.mode`

---

## See also

- [`14-voice-speech-integration.md`](14-voice-speech-integration.md) — the canonical example of the pattern (TTS / STT / Realtime added together)
- [`19-adding-video-provider.md`](19-adding-video-provider.md) — §A is the same pattern applied retrospectively to video
- [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md) — when one provider spans multiple modalities (Replicate)
- [`CHECKLIST.md`](CHECKLIST.md) — pasteable PR checklist
