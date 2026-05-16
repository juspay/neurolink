# 22 · Adding a Multi-Modal Provider (Replicate-style) — Exhaustive Guide

This guide covers a special case: a single upstream that spans **multiple modalities** (LLM + image + video + avatar + music + …) under one auth token and one prediction lifecycle.

The canonical example is **Replicate**, which hosts thousands of community models across categories. Adding Replicate as 5 separate providers is duplicative; adding it once as a multi-modal provider lets a single auth path serve every modality.

This guide also applies to similar gateways:

- **Replicate** — universal hosted-model gateway (FLUX, Wan-Alpha, MuseTalk, …)
- **Together AI** — open-model hosting (Llama variants, Mistral, …)
- **Fireworks AI** — open-model hosting
- **Hugging Face Inference Endpoints** — already partially modeled but cross-modality story is incomplete

---

## Architectural insight

A multi-modal provider has:

- **One auth identity** (`REPLICATE_API_TOKEN`)
- **One prediction lifecycle** (POST `/v1/predictions` → poll `/v1/predictions/{id}`)
- **N modality outputs** (text completion, image binary, video binary, audio binary, …)
- **Model-driven dispatch** (the `model: "owner/name:version"` string determines what kind of output you get)

The right shape is:

```
src/lib/adapters/replicate/
├── predictionLifecycle.ts        # Shared async-job helper
├── auth.ts                        # Shared auth + base URL
└── replicateClient.ts             # Optional: shared low-level client

src/lib/providers/
├── replicate.ts                   # LLM (BaseProvider subclass)

src/lib/adapters/video/
├── replicateVideoHandler.ts       # VideoHandler implementation

src/lib/avatar/providers/
├── ReplicateAvatar.ts             # AvatarHandler implementation

src/lib/music/providers/
├── ReplicateMusic.ts              # MusicHandler implementation (when music modality exists)

# image-gen has no separate handler — Replicate LLM provider's
# executeImageGeneration override handles model: "<owner>/flux-1.1-pro:..."
```

Each handler is a thin adapter calling the same `predictionLifecycle.create(model, input)` helper with different `model` slugs. The auth and polling logic lives once.

---

## Prerequisites

Before adding the multi-modal provider, the target modalities must already exist as registries:

- LLM — exists via `ProviderFactory` / `ProviderRegistry` (always available)
- TTS / STT / Realtime — exist via `TTSProcessor` / `STTProcessor` / `RealtimeProcessor` (post `27a31c32`)
- Video — requires §A of [`19-adding-video-provider.md`](19-adding-video-provider.md) to introduce `VideoHandler` / `VideoProcessor`
- Avatar / Music — require [`21-adding-new-modality.md`](21-adding-new-modality.md) for each new category

Land the modality infrastructure first; multi-modal providers consume those registries.

---

## Step-by-step (using Replicate as the worked example)

### Step 1 — Shared prediction lifecycle helper

**File:** `src/lib/adapters/replicate/predictionLifecycle.ts` — NEW.

```typescript
import { logger } from "../../utils/logger.js";

export type ReplicateAuth = {
  apiToken: string;
  baseUrl?: string;
};

export type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown; // model-specific shape (string URL, array, base64, etc.)
  error?: string;
  metrics?: { predict_time?: number };
  urls?: { get: string; cancel: string };
};

export type CreatePredictionInput = {
  model: string; // "owner/name" or "owner/name:version"
  input: Record<string, unknown>;
  webhook?: string;
};

const DEFAULT_BASE_URL = "https://api.replicate.com";
const POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;

export async function createPrediction(
  auth: ReplicateAuth,
  input: CreatePredictionInput,
): Promise<Prediction> {
  const baseUrl = auth.baseUrl ?? DEFAULT_BASE_URL;
  const [modelPath, version] = input.model.split(":");

  const endpoint = version
    ? `${baseUrl}/v1/predictions`
    : `${baseUrl}/v1/models/${modelPath}/predictions`; // latest version

  const body = version
    ? { version, input: input.input, webhook: input.webhook }
    : { input: input.input, webhook: input.webhook };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Token ${auth.apiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=60", // Lets Replicate hold the request up to 60s waiting
      // for completion before falling back to async polling
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(
      `Replicate predictions submit failed: ${resp.status} — ${errorText}`,
    );
  }

  return resp.json();
}

export async function pollPrediction(
  auth: ReplicateAuth,
  predictionId: string,
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    abortSignal?: AbortSignal;
  } = {},
): Promise<Prediction> {
  const baseUrl = auth.baseUrl ?? DEFAULT_BASE_URL;
  const startTime = Date.now();
  const totalTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollInterval = options.pollIntervalMs ?? POLL_INTERVAL_MS;

  while (Date.now() - startTime < totalTimeout) {
    if (options.abortSignal?.aborted) {
      throw new Error("Replicate poll aborted");
    }
    const resp = await fetch(`${baseUrl}/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${auth.apiToken}` },
    });
    if (!resp.ok) {
      throw new Error(
        `Replicate poll failed: ${resp.status} — ${await resp.text()}`,
      );
    }
    const pred = (await resp.json()) as Prediction;
    if (pred.status === "succeeded") return pred;
    if (pred.status === "failed" || pred.status === "canceled") {
      throw new Error(
        `Replicate prediction ${pred.status}: ${pred.error ?? "unknown"}`,
      );
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error(
    `Replicate prediction ${predictionId} timed out after ${totalTimeout}ms`,
  );
}

/**
 * Submit a prediction and wait for completion. Combines createPrediction + pollPrediction.
 * Uses the `Prefer: wait=60` hint so short jobs complete in the initial POST and
 * skip polling entirely.
 */
export async function predict(
  auth: ReplicateAuth,
  input: CreatePredictionInput,
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    abortSignal?: AbortSignal;
  } = {},
): Promise<Prediction> {
  const submitted = await createPrediction(auth, input);
  if (submitted.status === "succeeded") return submitted; // wait=60 hit
  if (submitted.status === "failed" || submitted.status === "canceled") {
    throw new Error(
      `Replicate immediate failure: ${submitted.error ?? "unknown"}`,
    );
  }
  return pollPrediction(auth, submitted.id, options);
}

/**
 * Download the binary output from a Replicate prediction.
 * Replicate returns either a single URL string or an array of URLs.
 */
export async function downloadPredictionOutput(
  prediction: Prediction,
): Promise<Buffer> {
  const output = prediction.output;
  const url = Array.isArray(output) ? output[0] : output;
  if (typeof url !== "string") {
    throw new Error(
      `Replicate prediction output is not a URL: ${typeof output}`,
    );
  }
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download Replicate output: ${resp.status}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}
```

This is the common bottom-half. Every Replicate-backed handler calls `predict()` + `downloadPredictionOutput()`.

### Step 2 — Shared auth helper

**File:** `src/lib/adapters/replicate/auth.ts` — NEW.

```typescript
import type { ReplicateAuth } from "./predictionLifecycle.js";

export function getReplicateAuth(
  override?: Partial<ReplicateAuth>,
): ReplicateAuth | null {
  const apiToken = (
    override?.apiToken ??
    process.env.REPLICATE_API_TOKEN ??
    ""
  ).trim();
  if (!apiToken) return null;
  return {
    apiToken,
    baseUrl: override?.baseUrl ?? process.env.REPLICATE_BASE_URL,
  };
}
```

Used by every Replicate handler. Returns `null` when `REPLICATE_API_TOKEN` is missing — handlers' `isConfigured()` calls this and returns `auth !== null`.

### Step 3 — LLM provider

**File:** `src/lib/providers/replicate.ts` — NEW.

Standard `BaseProvider` subclass per [`15-adding-llm-provider.md`](15-adding-llm-provider.md). Replicate's LLM models (Llama, Qwen, Mistral, etc.) are accessible via the prediction API:

```typescript
import { BaseProvider } from "../core/baseProvider.js";
import { AIProviderName } from "../constants/enums.js";
import { getReplicateAuth } from "../adapters/replicate/auth.js";
import {
  predict,
  downloadPredictionOutput,
} from "../adapters/replicate/predictionLifecycle.js";

export class ReplicateProvider extends BaseProvider {
  // ... constructor / abstract overrides per 15-adding-llm-provider.md ...

  protected async executeStream(options: StreamOptions): Promise<StreamResult> {
    const auth = getReplicateAuth(this.credentials);
    if (!auth) {
      throw new NeuroLinkError({
        code: "REPLICATE_NOT_CONFIGURED",
        message: "REPLICATE_API_TOKEN not set",
        // ...
      });
    }

    // Replicate streaming uses Server-Sent Events on a separate endpoint
    // when `stream: true` is passed in input. For simpler handlers, fall
    // back to predict-then-stream the result.

    const prediction = await predict(auth, {
      model: this.modelName,
      input: {
        prompt: this.buildSinglePrompt(options),
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        // Other model-specific params
      },
    });

    // Stream the buffered output as if it were chunks
    return this.synthesizeStreamFromText(
      typeof prediction.output === "string"
        ? prediction.output
        : (prediction.output as string[]).join(""),
    );
  }

  // For image-gen models, route through executeImageGeneration:
  protected async executeImageGeneration(options: TextGenerationOptions) {
    const auth = getReplicateAuth(this.credentials);
    if (!auth) throw new NeuroLinkError(/* ... */);

    const prediction = await predict(auth, {
      model: this.modelName, // e.g., "black-forest-labs/flux-1.1-pro"
      input: {
        prompt: options.prompt ?? options.input?.text,
        aspect_ratio: options.aspectRatio,
        num_outputs: options.numberOfImages ?? 1,
      },
    });

    const imageBuffer = await downloadPredictionOutput(prediction);
    return {
      content: options.prompt ?? "",
      provider: this.providerName,
      model: this.modelName,
      usage: { input: 0, output: 0, total: 0 },
      imageOutput: {
        imageBuffer,
        base64: imageBuffer.toString("base64"),
        mimeType: "image/png", // FLUX returns PNG
      },
    } as EnhancedGenerateResult;
  }
}
```

Add to `IMAGE_GENERATION_MODELS` constant: a prefix that matches Replicate image models, e.g., `"flux"`, `"stability"`, `"sdxl"`.

Per [`15-adding-llm-provider.md`](15-adding-llm-provider.md), also touch:

- `AIProviderName.REPLICATE = "replicate"` enum entry
- `NeurolinkCredentials.replicate?: { apiToken?: string; baseUrl?: string }`
- `providerRegistry.ts` registration block
- `providerConfig.ts` helper (`createReplicateConfig()`)
- `commandFactory.ts` provider choices
- `.env.example` (`REPLICATE_API_TOKEN`)
- `pricing.ts` (Replicate has per-model pricing — most models charge per-second of compute; default to a generic rate)
- Tests in `test/continuous-test-suite-providers.ts` and `test/continuous-test-suite-new-providers.ts`

### Step 4 — Video handler

**File:** `src/lib/adapters/video/replicateVideoHandler.ts` — NEW.

Implements `VideoHandler` (defined in §A of [`19-adding-video-provider.md`](19-adding-video-provider.md)):

```typescript
import type {
  VideoHandler,
  VideoOutputOptions,
  VideoGenerationResult,
} from "../../types/index.js";
import {
  predict,
  downloadPredictionOutput,
} from "../replicate/predictionLifecycle.js";
import { getReplicateAuth } from "../replicate/auth.js";
import { VideoError, VIDEO_ERROR_CODES } from "../../utils/videoProcessor.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";

export class ReplicateVideoHandler implements VideoHandler {
  // Provider-agnostic — capabilities depend on the specific model id used.
  // Don't claim specific durations or resolutions.

  private readonly defaultModel: string;

  constructor(opts: { defaultModel?: string } = {}) {
    this.defaultModel = opts.defaultModel ?? "atonamy/wan-alpha";
  }

  isConfigured(): boolean {
    return getReplicateAuth() !== null;
  }

  async generate(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
  ): Promise<VideoGenerationResult> {
    const auth = getReplicateAuth();
    if (!auth) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "REPLICATE_API_TOKEN not set",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // Replicate video models vary in input shape. Common shape for image-to-video:
    // input: { image: <data-uri-or-url>, prompt, num_frames, fps, ... }
    const startTime = Date.now();
    const dataUri = `data:image/png;base64,${image.toString("base64")}`;

    const prediction = await predict(auth, {
      model: (options as { model?: string }).model ?? this.defaultModel,
      input: {
        image: dataUri,
        prompt,
        num_frames: (options.length ?? 4) * 24, // 24 FPS assumption
        fps: 24,
        aspect_ratio: options.aspectRatio,
      },
    });

    const videoBuffer = await downloadPredictionOutput(prediction);

    return {
      data: videoBuffer,
      mediaType: "video/mp4",
      metadata: {
        duration: options.length ?? 4,
        dimensions: this.calculateDimensions(options),
        model: this.defaultModel,
        provider: "replicate",
        aspectRatio: options.aspectRatio ?? "16:9",
        audioEnabled: false, // Most Replicate video models are silent
        processingTime: Date.now() - startTime,
      },
    };
  }

  private calculateDimensions(opts: VideoOutputOptions): {
    width: number;
    height: number;
  } {
    // Same shape as vertexVideoHandler's calculateDimensions
    return { width: 1280, height: 720 };
  }
}
```

Register in `providerRegistry.ts`:

```typescript
try {
  const { VideoProcessor } = await import("../utils/videoProcessor.js");
  const { ReplicateVideoHandler } =
    await import("../adapters/video/replicateVideoHandler.js");
  VideoProcessor.registerHandler("replicate", new ReplicateVideoHandler());
} catch (err) {
  logger.debug(
    `[ProviderRegistry] replicate video registration skipped: ${err instanceof Error ? err.message : String(err)}`,
  );
}
```

Now `nl.generate({ output: { mode: "video", video: { provider: "replicate", model: "atonamy/wan-alpha:..." } } })` works.

### Step 5 — Avatar handler

**File:** `src/lib/avatar/providers/ReplicateAvatar.ts` — NEW.

Implements `AvatarHandler` (defined in [`21-adding-new-modality.md`](21-adding-new-modality.md)). MuseTalk model id: `<owner>/musetalk:<version>` — submit image + audio, poll, download.

```typescript
import type {
  AvatarHandler,
  AvatarOptions,
  AvatarResult,
} from "../../types/index.js";
import {
  predict,
  downloadPredictionOutput,
} from "../../adapters/replicate/predictionLifecycle.js";
import { getReplicateAuth } from "../../adapters/replicate/auth.js";
import {
  AvatarError,
  AVATAR_ERROR_CODES,
} from "../../utils/avatarProcessor.js";

export class ReplicateAvatar implements AvatarHandler {
  // Default to MuseTalk; callers can pass `model:` for other lip-sync models.
  private readonly defaultModel =
    "lucataco/musetalk:c3a2f4d7e1b5d9a8f6e2b7c3a8d4e9f1b6c7a2e8d3b9f5c1a4e7b8d2f9c6a3e5";

  isConfigured(): boolean {
    return getReplicateAuth() !== null;
  }

  async generate(options: AvatarOptions): Promise<AvatarResult> {
    const auth = getReplicateAuth();
    if (!auth) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "REPLICATE_API_TOKEN not set",
      });
    }

    const startTime = Date.now();
    const imageBuffer = await this.resolveBuffer(options.image);
    const audioBuffer = options.audio
      ? await this.resolveBuffer(options.audio)
      : undefined;

    if (!audioBuffer) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.INVALID_INPUT,
        message:
          "Replicate avatar handler requires audio. Pass options.audio (Buffer or path).",
        retriable: false,
      });
    }

    const prediction = await predict(auth, {
      model: (options as { model?: string }).model ?? this.defaultModel,
      input: {
        image: `data:image/png;base64,${imageBuffer.toString("base64")}`,
        audio: `data:audio/mp3;base64,${audioBuffer.toString("base64")}`,
        // MuseTalk-specific extras
        bbox_shift: 0,
        fps: 25,
      },
    });

    const videoBuffer = await downloadPredictionOutput(prediction);

    return {
      buffer: videoBuffer,
      format: "mp4",
      size: videoBuffer.length,
      provider: "replicate",
      metadata: {
        latency: Date.now() - startTime,
        provider: "replicate",
        model: this.defaultModel,
      },
    };
  }

  private async resolveBuffer(
    input: Buffer | string,
    maxBytes: number,
    label: string,
  ): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      if (input.length > maxBytes) {
        throw new Error(
          `${label} buffer too large: ${input.length} bytes (max ${maxBytes})`,
        );
      }
      return input;
    }
    // Reject local file paths — only Buffer or HTTPS URLs are accepted.
    if (!/^https:\/\//.test(input)) {
      throw new Error(
        `Invalid input: expected Buffer or HTTPS URL, got "${input}". Local file reads are not supported.`,
      );
    }
    // SSRF guard: validate the URL resolves to a public IP before fetching.
    const { assertSafeUrl } = await import("../../utils/ssrfGuard.js");
    await assertSafeUrl(input);
    const FETCH_TIMEOUT_MS = 60_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let r: Response;
    try {
      r = await fetch(input, { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `Fetch of ${label} timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    if (!r.ok) {
      throw new Error(`Failed to fetch ${label}: HTTP ${r.status}`);
    }
    // Bounded read: rejects responses that exceed the size cap.
    const { readBoundedBuffer } = await import("../../utils/sizeGuard.js");
    return readBoundedBuffer(r, maxBytes, label);
  }
}
```

Register in `providerRegistry.ts`:

```typescript
try {
  const { AvatarProcessor } = await import("../utils/avatarProcessor.js");
  const { ReplicateAvatar } =
    await import("../avatar/providers/ReplicateAvatar.js");
  AvatarProcessor.registerHandler("replicate", new ReplicateAvatar());
  // Aliases for explicit model targeting:
  AvatarProcessor.registerHandler("musetalk", new ReplicateAvatar());
} catch (err) {
  logger.debug(
    `[ProviderRegistry] replicate avatar registration skipped: ${err instanceof Error ? err.message : String(err)}`,
  );
}
```

### Step 6 — Music handler (when Music modality exists)

**File:** `src/lib/music/providers/ReplicateMusic.ts` — NEW.

Implements `MusicHandler`. Same shape as `ReplicateAvatar` with audio-only output.

Replicate music models include:

- `meta/musicgen` — Meta's MusicGen
- `riffusion/riffusion` — Riffusion (image-to-music)
- `mtg/audiogen` — Sound effects + ambient

### Step 7 — Image-gen via the LLM provider's executeImageGeneration

The LLM provider (Step 3) already handles this case. Add prefixes to `IMAGE_GENERATION_MODELS`:

```diff
 export const IMAGE_GENERATION_MODELS = [
   "dall-e",
   "imagen",
   "stable-diffusion",
+  "flux",
+  "sdxl",
+  "playground-v2",
+  "ideogram",
 ];
```

Now `nl.generate({ provider: "replicate", model: "black-forest-labs/flux-1.1-pro:..." })` routes through `executeImageGeneration` automatically.

---

## Calling pattern from the consumer's perspective

After all four flavors are wired:

```typescript
const nl = new NeuroLink();

// LLM via Replicate
await nl.generate({
  provider: "replicate",
  model: "meta/llama-3.1-70b-instruct",
  input: { text: "Explain quantum entanglement" },
});

// Image gen via Replicate
await nl.generate({
  provider: "replicate",
  model: "black-forest-labs/flux-1.1-pro",
  input: { text: "A serene mountain landscape" },
});

// Video gen via Replicate
await nl.generate({
  provider: "replicate", // The LLM provider, used as routing default
  input: { text: "smooth zoom-out", images: [imageBuffer] },
  output: {
    mode: "video",
    video: {
      provider: "replicate",
      model: "atonamy/wan-alpha:...",
      length: 4,
    },
  },
});

// Avatar via Replicate
await nl.generate({
  provider: "replicate",
  output: {
    mode: "avatar",
    avatar: {
      provider: "replicate",
      image: portraitBuffer,
      audio: narrationBuffer,
    },
  },
});
```

One auth token (`REPLICATE_API_TOKEN`), four modalities, four registered handlers.

---

## Pricing nuance

Replicate charges **per second of compute**, not per token. The pricing table (`src/lib/utils/pricing.ts`) is keyed on tokens. For multi-modal providers, you have two options:

**Option A — symbolic per-token rate**

```typescript
"replicate": {
  _default: { input: 0.0001, output: 0.0002 },
},
```

Cost attribution shows non-zero values but doesn't reflect actual Replicate billing. Acceptable for ops-dashboard purposes.

**Option B — separate compute-time pricing**

Extend the pricing module to support compute-second billing for providers that use it. This is a wider change (touches `pricing.ts`, telemetry, dashboards). Discuss with maintainers.

The voice / video / avatar / music handlers already record `processingTime` in `metadata`; future cost-attribution for compute-time providers can derive billing from that field.

---

## Testing

### Cross-modality test suite

**File:** `test/continuous-test-suite-replicate.ts` — NEW.

```typescript
const tests = [
  // LLM
  {
    name: "Replicate LLM — Llama 3.1 70B generates response",
    fn: async () => {
      if (!process.env.REPLICATE_API_TOKEN) return true;
      const nl = new NeuroLink();
      const result = await nl.generate({
        provider: "replicate",
        model: "meta/llama-3.1-70b-instruct",
        input: { text: "Hello" },
      });
      return result.content.length > 0;
    },
  },
  // Image
  {
    name: "Replicate image — FLUX generates PNG",
    fn: async () => {
      if (!process.env.REPLICATE_API_TOKEN) return true;
      const result = await new NeuroLink().generate({
        provider: "replicate",
        model: "black-forest-labs/flux-1.1-pro",
        input: { text: "A red circle" },
      });
      return result.imageOutput?.imageBuffer.length > 1000;
    },
  },
  // Video
  {
    name: "Replicate video — Wan-Alpha generates MP4",
    fn: async () => {
      if (!process.env.REPLICATE_API_TOKEN) return true;
      const image = await fs.readFile("test/fixtures/test-image.jpg");
      const result = await new NeuroLink().generate({
        input: { text: "slow zoom", images: [image] },
        output: {
          mode: "video",
          video: { provider: "replicate", model: "atonamy/wan-alpha:..." },
        },
      });
      return result.video?.data.length > 100_000;
    },
  },
  // Avatar
  {
    name: "Replicate avatar — MuseTalk produces talking-head",
    fn: async () => {
      if (!process.env.REPLICATE_API_TOKEN) return true;
      const image = await fs.readFile("test/fixtures/portrait.jpg");
      const audio = await fs.readFile("test/fixtures/narration.mp3");
      const result = await new NeuroLink().generate({
        output: {
          mode: "avatar",
          avatar: { provider: "replicate", image, audio },
        },
      });
      return result.avatar?.buffer.length > 100_000;
    },
  },
  // Shared lifecycle test
  {
    name: "Replicate prediction lifecycle — handles wait=60",
    fn: async () => {
      if (!process.env.REPLICATE_API_TOKEN) return true;
      const { predict } =
        await import("../src/lib/adapters/replicate/predictionLifecycle.js");
      const auth = { apiToken: process.env.REPLICATE_API_TOKEN! };
      const result = await predict(auth, {
        model: "stability-ai/sdxl",
        input: { prompt: "test", num_inference_steps: 1 },
      });
      return result.status === "succeeded";
    },
  },
];
```

Add `test:replicate` script to `package.json`.

---

## Documentation

### `docs/getting-started/providers/replicate.md` — NEW

Cover all four flavors:

1. Overview — what Replicate is, the universal-gateway pattern
2. Quick start — get token, run any of the 4 modalities
3. Supported modalities — table mapping each modality to the example model
4. Model selection — how to find / pin model versions on Replicate's catalog
5. Pricing — link to Replicate's per-model pricing
6. Auth scoping — production vs sandbox tokens
7. Troubleshooting — `version not found`, `rate limit`, `cold start delays`

### `docs/provider-integration/<NN>-replicate-integration.md` — NEW

Implementation journal documenting:

- Why one provider, four registrations (the multi-modal architecture)
- The shared prediction lifecycle (`Prefer: wait=60` optimisation, polling cadence, abort handling)
- Per-modality input shapes (image-to-video, audio-to-avatar, etc.)
- Trade-offs (pinning model versions vs accepting "latest")

### Cross-references

| File                                          | Update                                             |
| --------------------------------------------- | -------------------------------------------------- |
| `docs/features/index.md`                      | Add Replicate to "Supported Providers"             |
| `docs/reference/provider-comparison.md`       | Add a Replicate row in each modality section       |
| `docs/getting-started/providers/index.md`     | Card for Replicate                                 |
| `docs/features/video-generation.md`           | Mention Replicate as a route to Wan-Alpha + others |
| `docs/features/image-generation-streaming.md` | Mention Replicate as a route to FLUX + others      |

---

## Validation gates

```bash
pnpm run check
pnpm run lint
pnpm run build
pnpm run test:replicate    # cross-modality suite
pnpm run test:providers    # LLM-only sanity
pnpm run test:media        # video / image / avatar
# Real API smoke (each modality):
export REPLICATE_API_TOKEN=...
pnpm run cli generate "Hello" --provider replicate --model meta/llama-3.1-70b-instruct
pnpm run cli generate "A cat" --provider replicate --model black-forest-labs/flux-1.1-pro
```

---

## Common pitfalls

| Pitfall                                                                     | Fix                                                                                                                                       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Built one Replicate provider that registered five times in `AIProviderName` | Don't. One `AIProviderName.REPLICATE`; multiple modality registrations is fine because they're in different processors                    |
| Hardcoded model versions in handler code                                    | Versions rotate; pin via env vars (`REPLICATE_LLAMA_VERSION`, etc.) or accept the un-versioned form (`owner/name`) which routes to latest |
| Forgot the `Prefer: wait=60` header                                         | Every short job gets the full poll cycle; latency goes from ~3s to ~15s for trivial calls                                                 |
| Used `setInterval` for polling                                              | Doesn't compose with `AbortSignal`; use `setTimeout` in a `while` loop                                                                    |
| Treated all output as URL string                                            | Some Replicate models return arrays (multi-output) or base64 strings; handle both                                                         |
| Did not abstract auth                                                       | Each handler reads `REPLICATE_API_TOKEN` independently; `getReplicateAuth()` centralises the env var resolution                           |
| Missed a modality registration                                              | Caller calls `AvatarProcessor.supports("replicate")` and gets `false` even though the LLM works                                           |
| Did not version-pin in tests                                                | CI flakes when Replicate updates a model and breaks the input shape; pin model versions in test fixtures                                  |

---

## Other multi-modal candidates

The same pattern applies to:

- **Together AI** — has LLM, embeddings, image-gen across one auth. Add as `together` provider; share one auth helper.
- **Fireworks AI** — LLM + image-gen.
- **Hugging Face Inference Endpoints** — already a NeuroLink provider but cross-modal coverage is incomplete.
- **OpenRouter** — LLM-only today. If they add image / video routing, the same pattern fits.
- **Cloudflare Workers AI** — LLM + image-gen + STT in one auth.

For each: identify the prediction lifecycle (sync vs async, polling vs webhook), the per-modality input shape, and which modalities to wire.

---

## See also

- [`15-adding-llm-provider.md`](15-adding-llm-provider.md) — LLM provider basics (the LLM half of Replicate)
- [`19-adding-video-provider.md`](19-adding-video-provider.md) — VideoHandler interface (consumed here)
- [`20-adding-image-gen-provider.md`](20-adding-image-gen-provider.md) — image-gen via the LLM pathway (consumed here)
- [`21-adding-new-modality.md`](21-adding-new-modality.md) — AvatarHandler / MusicHandler interfaces (consumed here)
- [`CHECKLIST.md`](CHECKLIST.md) — pasteable PR checklist
