# 19 · Adding a New Video Provider — Exhaustive Guide

This guide adds a new video-generation provider (Kling, Runway, Wan-Alpha via Replicate, Pika, Luma) to NeuroLink.

> **Read first.** Unlike TTS / STT / Realtime, the video subsystem has **no handler abstraction yet**. The current code has a single hardcoded import of `generateVideoWithVertex` in `baseProvider.ts:1755`. To add a second video provider, you must first introduce a `VideoHandler` interface and a `VideoProcessor` registry. This guide covers both: §A is the one-time refactor, §B is the recurring per-provider work.

---

## Current state (the problem)

`src/lib/core/baseProvider.ts:815-816`:

```typescript
if (options.output?.mode === "video") {
  return await this.handleVideoGeneration(options, startTime);
}
```

`src/lib/core/baseProvider.ts:1755-1756`:

```typescript
const { generateVideoWithVertex, VideoError, VIDEO_ERROR_CODES } =
  await import("../adapters/video/vertexVideoHandler.js");
```

The `handleVideoGeneration` method directly imports a Vertex-specific function. There is no:

- `VideoHandler` interface
- `VideoProcessor` registry
- Type for `output.video.provider`
- Way to route to non-Vertex video providers

Any new video provider PR must either (a) refactor this dispatch, or (b) bolt on a `switch (provider)` (which doesn't scale and gets rejected). Do (a).

---

## §A — The one-time refactor

This refactor is behaviour-preserving for Vertex. After it lands, adding new video providers becomes mechanical (§B).

### A1. Move shared video types into a dedicated file

**File:** `src/lib/types/video.ts` — NEW.

Per CLAUDE.md rule 11 (no local types directories), shared video types live at the canonical types path. Today they live in `src/lib/types/multimodal.ts:150-221` (`VideoOutputOptions`, `VideoGenerationResult`); leave those re-exports in place for backwards compat.

```typescript
/**
 * Video Generation Type Definitions
 *
 * Shared types for video generation across providers (Vertex Veo, Kling,
 * Runway, Replicate-hosted models, etc.).
 *
 * @module types/video
 */

import type {
  VideoOutputOptions,
  VideoGenerationResult,
} from "./multimodal.js";

// Re-export from multimodal for caller convenience
export type {
  VideoOutputOptions,
  VideoGenerationResult,
} from "./multimodal.js";

/**
 * Director-mode transition options (shared by every provider that supports
 * first-and-last-frame interpolation, e.g. Veo 3.1 Fast).
 */
export type VideoTransitionOptions = {
  aspectRatio?: "9:16" | "16:9";
  resolution?: "720p" | "1080p";
  audio?: boolean;
};

/**
 * Handler contract for video generation providers.
 *
 * Implementations must enforce their own timeouts (recommended: 3 minutes
 * for predictLongRunning APIs that involve polling).
 */
export type VideoHandler = {
  /**
   * Generate a single video clip from an input image and prompt.
   */
  generate(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
    region?: string,
  ): Promise<VideoGenerationResult>;

  /**
   * Optional — generate a transition clip between two frames (Director Mode).
   * Providers without this capability omit the method.
   */
  generateTransition?(
    firstFrame: Buffer,
    lastFrame: Buffer,
    prompt: string,
    options?: VideoTransitionOptions,
    durationSeconds?: 4 | 6 | 8,
    region?: string,
  ): Promise<Buffer>;

  /**
   * Validate the provider is configured (auth, base URL, etc.).
   */
  isConfigured(): boolean;

  /**
   * Maximum video duration in seconds supported by this provider.
   */
  readonly maxDurationSeconds?: number;

  /**
   * Supported aspect ratios. Convention: `["9:16", "16:9", "1:1"]` — others
   * may be added per provider.
   */
  readonly supportedAspectRatios?: ("9:16" | "16:9" | "1:1" | "4:3" | "3:4")[];

  /**
   * Supported resolutions.
   */
  readonly supportedResolutions?: ("480p" | "720p" | "1080p" | "4k")[];
};
```

Add this file to `src/lib/types/index.ts` via `export * from "./video.js"` (per rule 10, barrel uses `export *` only).

### A2. Create the VideoProcessor registry

**File:** `src/lib/utils/videoProcessor.ts` — NEW.

Mirror `src/lib/utils/ttsProcessor.ts:75-352`:

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
  VideoGenerationResult,
  VideoHandler,
  VideoOutputOptions,
  VideoTransitionOptions,
} from "../types/index.js";

export const VIDEO_ERROR_CODES = {
  PROVIDER_NOT_SUPPORTED: "VIDEO_PROVIDER_NOT_SUPPORTED",
  PROVIDER_NOT_CONFIGURED: "VIDEO_PROVIDER_NOT_CONFIGURED",
  GENERATION_FAILED: "VIDEO_GENERATION_FAILED",
  POLL_TIMEOUT: "VIDEO_POLL_TIMEOUT",
  INVALID_INPUT: "VIDEO_INVALID_INPUT",
  TRANSITION_NOT_SUPPORTED: "VIDEO_TRANSITION_NOT_SUPPORTED",
  DIRECTOR_TRANSITION_FAILED: "VIDEO_DIRECTOR_TRANSITION_FAILED",
} as const;

export class VideoError extends NeuroLinkError {
  // Same shape as TTSError / STTError
}

export class VideoProcessor {
  private static readonly handlers = new Map<string, VideoHandler>();

  static registerHandler(name: string, handler: VideoHandler): void {
    if (!name) throw new Error("Provider name required");
    if (!handler) throw new Error("Handler required");
    const key = name.toLowerCase();
    if (this.handlers.has(key)) {
      logger.warn(`[VideoProcessor] Overwriting handler for: ${key}`);
    }
    this.handlers.set(key, handler);
  }

  static supports(name: string): boolean {
    return name ? this.handlers.has(name.toLowerCase()) : false;
  }

  private static getHandler(name: string): VideoHandler | undefined {
    return this.handlers.get(name.toLowerCase());
  }

  static async generate(
    provider: string,
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
    region?: string,
  ): Promise<VideoGenerationResult> {
    const span = SpanSerializer.createSpan(SpanType.VIDEO, "video.generate", {
      "video.provider": provider,
      "video.resolution": options.resolution,
      "video.duration": options.length,
    });

    try {
      const handler = this.getHandler(provider);
      if (!handler) {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
          message: `Video provider "${provider}" not registered. Available: ${Array.from(this.handlers.keys()).join(", ")}`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
        });
      }
      if (!handler.isConfigured()) {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
          message: `Video provider "${provider}" is not configured`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
        });
      }
      const result = await handler.generate(image, prompt, options, region);
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

  static async generateTransition(
    provider: string,
    firstFrame: Buffer,
    lastFrame: Buffer,
    prompt: string,
    options?: VideoTransitionOptions,
    durationSeconds?: 4 | 6 | 8,
    region?: string,
  ): Promise<Buffer> {
    const handler = this.getHandler(provider);
    if (!handler) throw /* PROVIDER_NOT_SUPPORTED */ ...;
    if (!handler.generateTransition) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.TRANSITION_NOT_SUPPORTED,
        message: `Provider "${provider}" does not support transition clips`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }
    return handler.generateTransition(firstFrame, lastFrame, prompt, options, durationSeconds, region);
  }
}
```

Also add `SpanType.VIDEO` to `src/lib/types/span.ts` (the existing `STT` enum entry from `27a31c32` is the template).

### A3. Wrap the existing Vertex handler in a class

**File:** `src/lib/adapters/video/vertexVideoHandler.ts` (existing) — add a class export at the bottom that delegates to the existing free functions.

```typescript
import type { VideoHandler } from "../../types/index.js";

export class VertexVideoHandler implements VideoHandler {
  public readonly maxDurationSeconds = 8;
  public readonly supportedAspectRatios = ["9:16", "16:9"] as const;
  public readonly supportedResolutions = ["720p", "1080p"] as const;

  isConfigured(): boolean {
    return isVertexVideoConfigured();
  }

  generate(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
    region?: string,
  ): Promise<VideoGenerationResult> {
    return generateVideoWithVertex(image, prompt, options, region);
  }

  generateTransition(
    firstFrame: Buffer,
    lastFrame: Buffer,
    prompt: string,
    options?: VideoTransitionOptions,
    durationSeconds?: 4 | 6 | 8,
    region?: string,
  ): Promise<Buffer> {
    return generateTransitionWithVertex(
      firstFrame,
      lastFrame,
      prompt,
      options ?? {},
      durationSeconds ?? 4,
      region,
    );
  }
}
```

**Keep the existing free functions exported.** External callers (Director's `directorPipeline.ts`, third-party scripts) reference them directly. Removing the functions is a public-API break.

### A4. Register Vertex in providerRegistry.ts

**File:** `src/lib/factories/providerRegistry.ts`. Add a new section after the Realtime block (~line 666):

```typescript
// ===== VIDEO HANDLER REGISTRATION =====
try {
  const { VideoProcessor } = await import("../utils/videoProcessor.js");
  const { VertexVideoHandler } =
    await import("../adapters/video/vertexVideoHandler.js");
  VideoProcessor.registerHandler("vertex", new VertexVideoHandler());
  logger.debug("Video handlers registered: vertex");
} catch (err) {
  logger.warn(
    `[ProviderRegistry] vertex video registration failed: ${err instanceof Error ? err.message : String(err)}`,
  );
}
```

### A5. Replace the hardcoded import in baseProvider.ts

**File:** `src/lib/core/baseProvider.ts:1750-2006`. The full method `handleVideoGeneration` currently directly imports `generateVideoWithVertex`. Replace with a `VideoProcessor.generate` call:

```diff
 private async handleVideoGeneration(
   options: TextGenerationOptions,
   startTime: number,
 ): Promise<EnhancedGenerateResult> {
-  const { generateVideoWithVertex, VideoError, VIDEO_ERROR_CODES } =
-    await import("../adapters/video/vertexVideoHandler.js");
+  const { VideoProcessor, VideoError, VIDEO_ERROR_CODES } =
+    await import("../utils/videoProcessor.js");
   const {
     validateVideoGenerationInput,
     validateImageForVideo,
     validateDirectorModeInput,
   } = await import("../utils/parameterValidation.js");
   const { ErrorFactory } = await import("../utils/errorHandling.js");

   // ... validation, image loading (unchanged) ...

+  const provider = options.output?.video?.provider ?? options.provider ?? "vertex";

   // Generate video using selected handler
-  const videoResult = await generateVideoWithVertex(
+  const videoResult = await VideoProcessor.generate(
+    provider,
     imageBuffer,
     prompt,
-    options.output?.video,
+    options.output?.video ?? {},
     options.region,
   );

   // Build result
   const baseResult: EnhancedGenerateResult = {
     content: prompt,
-    provider: "vertex",
+    provider,
     model: options.model || "veo-3.1-generate-001",
     usage: { input: 0, output: 0, total: 0 },
     video: videoResult,
   };

   return await this.enhanceResult(baseResult, options, startTime);
 }
```

Same replacement applies to the Director-mode branch (`directorPipeline.ts:289`):

```diff
- const result = await generateVideoWithVertex(
+ const result = await VideoProcessor.generate(
+   "vertex",
   image, prompt, opts, region,
 );
```

`directorPipeline` orchestrates multiple segments and transitions; it should accept a `provider` argument and thread it through. Keep Vertex as the default for backwards compat.

### A6. Add `provider` to VideoOutputOptions

**File:** `src/lib/types/multimodal.ts` (where `VideoOutputOptions` lives).

```diff
 export type VideoOutputOptions = {
+  /** Override the video-gen provider. Defaults to the LLM provider or "vertex". */
+  provider?: string;
   resolution?: "720p" | "1080p";
   length?: 4 | 6 | 8;
   aspectRatio?: "9:16" | "16:9";
   audio?: boolean;
   ...
 };
```

This is additive — existing callers ignore the new field.

### A7. CLI surface for `--video-provider`

**File:** `src/cli/factories/commandFactory.ts:2450` (the `output: { mode: "video" }` block).

```diff
 ...
 mode: "video" as const,
+ "video-provider": {
+   type: "string",
+   description: "Video-gen provider override (default: vertex)",
+ },
```

Threading: the CLI handler reads `argv.videoProvider` and sets `options.output.video.provider`.

### A8. Tests for the refactor

Add to `test/continuous-test-suite-media-gen.ts`:

```typescript
{
  name: "VideoProcessor.supports vertex",
  fn: async () => {
    const { VideoProcessor } = await import("@juspay/neurolink");
    return VideoProcessor.supports("vertex");
  },
},
{
  name: "VideoProcessor rejects unknown provider",
  fn: async () => {
    const { VideoProcessor } = await import("@juspay/neurolink");
    try {
      await VideoProcessor.generate("nonexistent", Buffer.alloc(1), "test", {});
      return false;
    } catch (err) {
      return err.code === "VIDEO_PROVIDER_NOT_SUPPORTED";
    }
  },
},
```

The existing Vertex-mode video tests (golden-path E2E) should keep passing without modification — that's the behaviour-preservation gate for the refactor.

---

## §B — Adding a video provider after the refactor

Once §A is in place, adding Kling / Runway / Pika / Luma is mechanical. Per provider:

### B1. Create the handler

**File:** `src/lib/adapters/video/<name>VideoHandler.ts` — NEW.

Skeleton (Kling example):

```typescript
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import { VideoError, VIDEO_ERROR_CODES } from "../../utils/videoProcessor.js";
import type {
  VideoHandler,
  VideoGenerationResult,
  VideoOutputOptions,
} from "../../types/index.js";
import { safeDownload } from "../../utils/safeFetch.js";
import { MAX_VIDEO_BYTES } from "../../utils/sizeGuard.js";

const DEFAULT_BASE_URL = "https://api.piapi.ai/api/kling/v1";
const POLL_INTERVAL_MS = 5_000;
const TOTAL_TIMEOUT_MS = 5 * 60_000;

export class KlingVideoHandler implements VideoHandler {
  public readonly maxDurationSeconds = 10;
  public readonly supportedAspectRatios = ["16:9", "9:16", "1:1"] as const;
  public readonly supportedResolutions = ["720p", "1080p"] as const;

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = (apiKey ?? process.env.KLING_API_KEY ?? "").trim() || null;
    this.baseUrl = process.env.KLING_BASE_URL ?? DEFAULT_BASE_URL;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
    _region?: string,
  ): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "KLING_API_KEY not set",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();

    // 1. Submit job
    const submitResp = await this.submitJob(image, prompt, options);
    const jobId = submitResp.task_id;

    // 2. Poll
    const videoBuffer = await this.pollUntilComplete(jobId, startTime);

    return {
      data: videoBuffer,
      mediaType: "video/mp4",
      metadata: {
        duration: options.length ?? 5,
        dimensions: this.calculateDimensions(options),
        model: "kling-1.6-i2v",
        provider: "kling",
        aspectRatio: options.aspectRatio ?? "16:9",
        audioEnabled: options.audio ?? false,
        processingTime: Date.now() - startTime,
      },
    };
  }

  private async submitJob(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
  ): Promise<{ task_id: string }> {
    // POST /image-to-video
    const response = await fetch(`${this.baseUrl}/image-to-video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: image.toString("base64"),
        prompt,
        duration: options.length ?? 5,
        aspect_ratio: options.aspectRatio ?? "16:9",
        cfg_scale: 0.5,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Kling submit failed: ${response.status} ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
      });
    }
    return response.json();
  }

  private async pollUntilComplete(
    jobId: string,
    startTime: number,
  ): Promise<Buffer> {
    while (Date.now() - startTime < TOTAL_TIMEOUT_MS) {
      const status = await this.checkStatus(jobId);
      if (status.status === "completed") {
        const videoUrl = status.video_url;
        // Preferred: use `safeDownload` from `src/lib/utils/safeFetch.ts`
        // — it combines `assertSafeUrl` + undici-pinned dispatcher (closes
        // the DNS-rebinding window) + `redirect: "manual"` + bounded read
        // in one call. Wrap any thrown error in a typed VideoError.
        try {
          return await safeDownload(videoUrl, {
            maxBytes: MAX_VIDEO_BYTES,
            label: "Kling video",
            timeoutMs: 60_000,
          });
        } catch (err) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.GENERATION_FAILED,
            message: `Kling video download failed: ${err instanceof Error ? err.message : String(err)}`,
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            retriable: true,
            context: { jobId, url: videoUrl },
            originalError: err instanceof Error ? err : undefined,
          });
        }
      }
      if (status.status === "failed") {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: `Kling job ${jobId} failed: ${status.error ?? "unknown"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
        });
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new VideoError({
      code: VIDEO_ERROR_CODES.POLL_TIMEOUT,
      message: `Kling job ${jobId} did not complete within ${TOTAL_TIMEOUT_MS / 1000}s`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retriable: true,
    });
  }

  private async checkStatus(
    jobId: string,
  ): Promise<{ status: string; video_url?: string; error?: string }> {
    const r = await fetch(`${this.baseUrl}/task/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return r.json();
  }

  private calculateDimensions(options: VideoOutputOptions): {
    width: number;
    height: number;
  } {
    // Same shape as vertexVideoHandler's calculateDimensions
    return { width: 1280, height: 720 };
  }
}
```

### B2. Register in providerRegistry.ts

```typescript
try {
  const { VideoProcessor } = await import("../utils/videoProcessor.js");
  const { KlingVideoHandler } =
    await import("../adapters/video/klingVideoHandler.js");
  VideoProcessor.registerHandler("kling", new KlingVideoHandler());
} catch (err) {
  logger.debug(
    `[ProviderRegistry] kling video registration skipped: ${err instanceof Error ? err.message : String(err)}`,
  );
}
```

### B3. Update VideoOutputOptions provider type union (optional)

You can leave `provider?: string` open-ended (accepting any registered name), or constrain it:

```typescript
export type VideoProviderName =
  | "vertex"
  | "kling"
  | "runway"
  | "luma"
  | "pika"
  | string;
```

Open-ended is generally better — third-party Replicate-hosted models slot in without changing this type.

### B4. .env.example

```bash
# =============================================================================
# KLING VIDEO CONFIGURATION
# =============================================================================
KLING_API_KEY=
# Optional: override base URL (e.g., for self-hosted proxy)
# KLING_BASE_URL=https://api.piapi.ai/api/kling/v1
```

### B5. Tests

`test/continuous-test-suite-media-gen.ts`:

```typescript
{
  category: "Video Providers",
  name: "Kling — generate() returns video",
  fn: async () => {
    if (!process.env.KLING_API_KEY) return true; // skip
    const image = await fs.readFile("test/fixtures/test-image.jpg");
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "A serene landscape", images: [image] },
      output: { mode: "video", video: { provider: "kling", length: 5 } },
    });
    assert(result.video?.data.length > 100_000, "video too small");
    assert(result.video?.mediaType === "video/mp4");
    return true;
  },
},
```

Real API tests are slow (1–3 minutes per generation) — gate them behind `LIVE_VIDEO_TESTS=1` or run on a dedicated CI lane.

### B6. Per-provider getting-started doc

`docs/getting-started/providers/<name>.md` — new file. Cover: API key signup, supported durations/resolutions/aspect-ratios, model variants, pricing.

---

## Summary — full scope of work

| Phase                  | Files NEW                                                                                                                    | Files EDIT                                                                                                                                                                                                                                                                    | Outcome                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| §A (one-time refactor) | `types/video.ts`, `utils/videoProcessor.ts`                                                                                  | `types/multimodal.ts`, `types/span.ts`, `types/index.ts`, `core/baseProvider.ts`, `adapters/video/vertexVideoHandler.ts`, `adapters/video/directorPipeline.ts`, `factories/providerRegistry.ts`, `cli/factories/commandFactory.ts`, `test/continuous-test-suite-media-gen.ts` | Vertex still works; future video providers can register via `VideoProcessor.registerHandler` |
| §B per Kling           | `adapters/video/klingVideoHandler.ts`, `docs/getting-started/providers/kling.md`                                             | `factories/providerRegistry.ts`, `.env.example`, `test/continuous-test-suite-media-gen.ts`                                                                                                                                                                                    | Kling available via `output: { mode: "video", video: { provider: "kling" } }`                |
| §B per Runway          | `adapters/video/runwayVideoHandler.ts`, `docs/getting-started/providers/runway.md`                                           | same 3 files                                                                                                                                                                                                                                                                  | Runway available                                                                             |
| §B per Wan-Alpha       | (typically lands as part of Replicate provider — see [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md)) |                                                                                                                                                                                                                                                                               |                                                                                              |

§A is one PR. Each §B is a separate PR.

---

## Common pitfalls

| Pitfall                                                       | Fix                                                                                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Tried to add Kling without doing §A first                     | Caller path is hardcoded to `generateVideoWithVertex`. Reviewer will reject. Refactor first.                                     |
| Removed the free `generateVideoWithVertex` function during §A | Public API break — Director and other external callers reference it directly. Keep both.                                         |
| Didn't update `directorPipeline.ts:289`                       | Director Mode silently routes through Vertex even when caller specifies a different provider                                     |
| Forgot `output.video.provider` in `VideoOutputOptions`        | Caller can't specify which provider to use; defaults to vertex always                                                            |
| Polling without absolute timeout                              | A stuck upstream hangs the whole `generate()` call indefinitely. Always cap with `TOTAL_TIMEOUT_MS`.                             |
| Used `setInterval` for polling                                | Doesn't compose with `AbortSignal`; use `setTimeout` in a while loop                                                             |
| Did not validate `image` format before submission             | Some providers (Kling, Runway) reject images outside their supported aspect ratios with cryptic errors; fail fast in the handler |
| Did not surface `mediaType` in result                         | Downstream consumers (ffmpeg merging, Mux upload) misroute when the type is wrong; always set explicitly                         |

---

## Provider quirks reference

For when you implement specific providers, the quirks to know:

### Kling (PiAPI)

- Asynchronous job model: POST `/image-to-video` → poll `/task/{id}`
- Average completion: 60–120s for 5s @ 720p
- Strict aspect ratio support: 16:9, 9:16, 1:1 (no 4:3)
- Audio: not supported in i2v mode

### Runway

- REST API at `https://api.runwayml.com/v1`
- Models: Gen-3 Alpha, Gen-4 Turbo
- Submission returns `taskId`; poll `/v1/tasks/{id}`
- 5s and 10s durations; 4K available on Gen-4

### Replicate-hosted models (Wan-Alpha, etc.)

- Generic prediction lifecycle: POST `/v1/predictions` → poll `/v1/predictions/{id}`
- Auth: `Authorization: Token $REPLICATE_API_TOKEN`
- Model identified by `version` hash
- See [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md) for the unified Replicate handler that covers video + avatar + image-gen with one auth path.

### Luma Dream Machine

- REST + webhook for completion (we use polling for simplicity)
- 5s default duration
- Supports keyframe sequences (similar to Veo Director Mode)

### Pika Labs

- Limited public API; mostly used through aggregators like Replicate
- If a direct API exists by the time you implement this, it follows the standard async-job pattern

---

## See also

- [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md) — Replicate (video + avatar + image-gen unified)
- [`21-adding-new-modality.md`](21-adding-new-modality.md) — pattern source for `VideoProcessor` (the new-modality template)
- `src/lib/adapters/video/vertexVideoHandler.ts:356` — reference implementation (predictLongRunning + polling)
- `src/lib/adapters/video/directorPipeline.ts` — multi-segment orchestration
- `docs/features/video-generation.md` — user-facing video docs
- `docs/features/video-director-mode.md` — Director Mode (multi-segment)
