# 20 · Adding a New Image-Generation Provider — Exhaustive Guide

This guide adds a new image-generation provider (Stability AI, FLUX.1, Ideogram, Recraft, Imagen variants) to NeuroLink.

> **Critical insight:** image-gen is **not a separate handler category** in NeuroLink. There is no `ImageGenHandler` or `ImageGenProcessor` registry. Image generation is dispatched through the existing **LLM provider** pathway, with the provider's model name driving the dispatch decision. Adding an "image-gen provider" therefore means adding (a) an LLM provider that can produce images, OR (b) just adding new image-capable models to an existing provider.

---

## How image-gen actually works in this codebase

`src/lib/core/baseProvider.ts:819-837`:

```typescript
const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
  this.modelName.includes(m),
);
const requestsNonImageOutput =
  options.output?.format === "json" ||
  options.output?.format === "structured" ||
  options.output?.format === "text";
if (isImageModel && !requestsNonImageOutput) {
  const imageResult = await this.executeImageGeneration(options);
  return await this.enhanceResult(imageResult, options, startTime);
}
```

The decision flow:

1. The caller passes `provider` + `model` (e.g., `provider: "openai", model: "dall-e-3"`).
2. `BaseProvider` constructs the right provider instance via the factory.
3. Inside `runGenerateInActiveContext`, if `modelName` matches any string in `IMAGE_GENERATION_MODELS`, the call is routed to `executeImageGeneration` (provider-specific override).
4. The provider's `executeImageGeneration` calls the upstream image API and returns `imageOutput.base64` / `imageOutput.imageBuffer`.

**There is no dedicated image-gen handler interface.** The four providers `ImageGenProvider = "vertex" | "openai" | "anthropic" | "bedrock"` (in `src/lib/types/imageGen.ts:15`) are LLM providers whose `BaseProvider` subclass implements an `executeImageGeneration` override.

`ImageGenService` (in `src/lib/image-gen/ImageGenService.ts`) is a thin caller-facing wrapper around `nl.generate(...)`. It does NOT register handlers — it just builds parameters and calls through.

---

## Decision tree — which path applies?

```
What's the new provider?

├─ A new LLM provider that produces both text AND images
│  (e.g., a new vendor whose API does both)
│  → §A — Full LLM provider with image-gen capability
│
├─ A new image-only provider (no chat completions)
│  (e.g., Stability AI, Ideogram, Recraft)
│  → §B — Image-only LLM provider (still slots into AIProviderName,
│         just doesn't expose chat completions)
│
├─ A new model on an existing provider (e.g., Imagen 4 on Vertex,
│  GPT-Image-1 on OpenAI)
│  → §C — Add the model name to IMAGE_GENERATION_MODELS,
│         optionally update the provider's executeImageGeneration
│
└─ A model that's only available via Replicate
   → See 22-adding-multimodal-provider.md (Replicate provider exposes
     image-gen models via a single Replicate identity)
```

---

## §A — Full LLM provider with image-gen capability

Follow [`15-adding-llm-provider.md`](15-adding-llm-provider.md) for steps 1–13 (provider class, enum, registry, etc.), then add the image-gen specifics:

### A1. Override `executeImageGeneration` in your provider class

The base class defines this in `src/lib/core/baseProvider.ts` (find it by grepping `executeImageGeneration`). The shape:

```typescript
protected async executeImageGeneration(
  options: TextGenerationOptions,
): Promise<EnhancedGenerateResult> {
  // 1. Extract prompt + reference images
  const prompt = options.prompt ?? options.input?.text ?? "";
  const refImages = options.input?.images ?? [];

  // 2. Hit the upstream image-gen API
  const response = await fetch(`${this.baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: this.modelName,
      prompt,
      n: options.numberOfImages ?? 1,
      size: this.mapAspectRatio(options.aspectRatio),
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    throw this.formatProviderError(new Error(await response.text()));
  }

  const data = await response.json();
  const base64 = data.data[0].b64_json;
  const imageBuffer = Buffer.from(base64, "base64");

  return {
    content: prompt, // Echo prompt as content
    provider: this.providerName,
    model: this.modelName,
    usage: { input: 0, output: 0, total: 0 },
    imageOutput: {
      base64,
      imageBuffer,
      mimeType: "image/png",
    },
  };
}
```

The result contract is `EnhancedGenerateResult.imageOutput` (or `images[]` for multi-image responses) — the exact shape is consumed by `ImageGenService.extractImageFromResult` which handles multiple variants (see `src/lib/image-gen/ImageGenService.ts:262-339`).

### A2. Add your model names to `IMAGE_GENERATION_MODELS`

**File:** `src/lib/constants/` (look for `IMAGE_GENERATION_MODELS` — it's an array constant grepping for it shows the location).

```diff
 export const IMAGE_GENERATION_MODELS = [
   "dall-e",
   "imagen",
   "stable-diffusion",
   "gemini-3-image-preview",
+  "<your-image-model-prefix>",
 ];
```

The dispatch in `baseProvider.ts:819` does `modelName.includes(m)`, so partial matches work. Use a string distinctive enough that it won't accidentally match unrelated models (`"dall-e"` matches `dall-e-2`, `dall-e-3`, etc.).

### A3. Add to ImageGenProvider type

**File:** `src/lib/types/imageGen.ts:15`:

```diff
- export type ImageGenProvider = "vertex" | "openai" | "anthropic" | "bedrock";
+ export type ImageGenProvider = "vertex" | "openai" | "anthropic" | "bedrock" | "<provider-name>";
```

This is the typed surface for `ImageGenService`. If you leave it unchanged, `ImageGenService` callers must use `as string` or `as ImageGenProvider` casts.

### A4. Update VISION_CAPABILITIES

In `src/lib/adapters/providerImageAdapter.ts:VISION_CAPABILITIES`:

```typescript
"<provider-name>": {
  supportsImages: true,
  supportedFormats: ["png", "jpeg", "webp"],
  maxImagesPerRequest: 4, // Reference images count for image-to-image gen
},
```

Vision capability here is about **reference images for input** (image-to-image generation), not about generating images. Many image-gen providers accept reference images (style transfer, IP-Adapter etc.) — set `supportsImages: true` for those.

### A5. Add image-gen tools registration (optional)

**File:** `src/lib/image-gen/imageGenTools.ts`.

If you want models to invoke image generation via tool calls (the model decides when to generate an image rather than the caller), add a custom tool:

```typescript
// imageGenTools.ts already has a `generate_image` tool that wraps ImageGenService.
// You don't usually need to add a new tool — the existing one routes through
// the provider you specify in ImageGenService config.
```

Custom tools are registered via `nl.registerCustomTools({ ... })` — see `docs/sdk-custom-tools.md` for the pattern.

### A6. Update `DEFAULT_IMAGE_GEN_CONFIG` (if your provider should be the default)

Don't change the default unless this is the canonical image-gen provider. Today: `defaultProvider: "vertex"`.

If you want an env-driven default:

```diff
 export const DEFAULT_IMAGE_GEN_CONFIG: ImageGenConfig = {
   enabled: true,
-  defaultModel: "imagen-3.0-generate-001",
-  defaultProvider: "vertex",
+  defaultModel: process.env.NEUROLINK_IMAGE_GEN_MODEL ?? "imagen-3.0-generate-001",
+  defaultProvider: process.env.NEUROLINK_IMAGE_GEN_PROVIDER ?? "vertex",
   defaultRegion: "global",
   timeout: 120_000,
   ...
 };
```

This is a non-trivial change — discuss with maintainers before shipping.

### A7. Tests

**File:** `test/continuous-test-suite-media-gen.ts`.

Pattern (mirror existing OpenAI/Vertex image-gen tests):

```typescript
{
  category: "Image Generation",
  name: "<Provider> dall-e-equivalent generates PNG",
  fn: async () => {
    if (!process.env.<NAME>_API_KEY) return true;
    const nl = new NeuroLink();
    const result = await nl.generate({
      provider: "<provider-name>",
      model: "<provider>-image-model-id",
      input: { text: "A peaceful mountain landscape" },
    });
    assert(result.imageOutput?.imageBuffer, "no image output");
    // Validate PNG magic bytes
    const head = result.imageOutput.imageBuffer.subarray(0, 4);
    assert(head[0] === 0x89 && head[1] === 0x50, "not a valid PNG");
    return true;
  },
},
```

Also add a test for image-to-image (reference images):

```typescript
{
  name: "<Provider> image-to-image with reference",
  fn: async () => {
    if (!process.env.<NAME>_API_KEY) return true;
    const ref = await fs.readFile("test/fixtures/style-reference.jpg");
    const nl = new NeuroLink();
    const result = await nl.generate({
      provider: "<provider-name>",
      model: "<provider>-image-model-id",
      input: { text: "A portrait in this art style", images: [ref] },
    });
    assert(result.imageOutput?.imageBuffer);
    return true;
  },
},
```

---

## §B — Image-only provider (no chat)

Same as §A but the provider class:

- Returns `false` from `supportsTools()` (image gen doesn't tool-call).
- Either omits `executeStream` (if you also want it to refuse text gen) or surfaces a friendly error.
- Has its `executeImageGeneration` as the primary entry point.

The `BaseProvider.runGenerateInActiveContext` flow already handles this: when the model matches `IMAGE_GENERATION_MODELS`, it short-circuits to `executeImageGeneration` and the `executeStream` path is skipped.

If your provider's only API is image-gen (no `/v1/chat/completions` equivalent at all), implement a stub `executeStream` that throws:

```typescript
protected async executeStream(): Promise<StreamResult> {
  throw new NeuroLinkError({
    code: "STABILITY_NO_TEXT_GEN",
    message: "Stability AI provider supports image generation only. Use a model name matching IMAGE_GENERATION_MODELS.",
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    retriable: false,
  });
}
```

This is suboptimal because the dispatch happens before this error fires (the provider tries to construct the AI SDK model first). For the cleanest experience, skip `getAISDKModel` overrides and write a fully custom `BaseProvider` subclass — see `src/lib/providers/sagemaker/` for the multi-file pattern (SageMaker has similar shape: not all SageMaker endpoints support all completion variants).

---

## §C — Adding a new image-gen model to an existing provider

This is the smallest possible change. Three files:

### C1. Add the model to `IMAGE_GENERATION_MODELS`

```diff
 export const IMAGE_GENERATION_MODELS = [
   "dall-e",
   "imagen",
+  "imagen-4",
   "stable-diffusion",
 ];
```

### C2. Add a constant in the provider's models file

`src/lib/models/<provider>.ts`:

```typescript
export const ImagenModels = {
  IMAGEN_3_GENERATE: "imagen-3.0-generate-001",
+ IMAGEN_4_GENERATE: "imagen-4.0-generate-001",
} as const;
```

### C3. (If needed) Update `executeImageGeneration` for new model-specific params

E.g., if Imagen 4 takes a different `aspectRatio` enum or supports a new style preset, branch on `modelName` inside the existing override.

### C4. Tests + docs

Update existing tests that loop over Vertex image models; add a model row to `docs/getting-started/providers/google-vertex.md`.

---

## §D — Image-gen via Replicate

Replicate hosts FLUX.1, Stable Diffusion variants, and many others. Don't implement them as separate providers — implement the Replicate provider once and expose them as `model` configs.

See [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md). The Replicate provider's `executeImageGeneration` parses `model: "owner/name:version"` and does the standard prediction-lifecycle dance.

---

## Documentation

### `docs/features/image-generation-streaming.md` — UPDATE

Add a section listing the new provider's supported models and aspect ratios.

### `docs/getting-started/providers/<name>.md` — NEW (for §A and §B)

Use `docs/getting-started/providers/openai.md` as a template — it documents both chat and image-gen on the same provider. Sections specific to image-gen:

- Supported models (DALL-E 2, DALL-E 3 for OpenAI; etc.)
- Aspect ratios / resolutions per model
- Reference image support (yes/no)
- Style controls (style presets, negative prompts)
- Pricing per image

---

## Validation gates

```bash
pnpm run check && pnpm run lint && pnpm run build
pnpm run test:media     # Image / video / multi-modal tests
pnpm run test:providers # Cross-provider sanity
# Real API smoke test:
export <NAME>_API_KEY=...
pnpm run cli generate "A beautiful landscape" --provider <name> --model <image-model> --output-image landscape.png
```

The CLI flag `--output-image <path>` captures `result.imageOutput.imageBuffer` to disk; without it, the binary is printed as a base64 blob.

---

## Common pitfalls

| Pitfall                                                                | Fix                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tried to add an "ImageGenHandler" interface                            | There isn't one. Image-gen routes through the LLM provider pathway.                                                                                                                                   |
| Added the provider but forgot `IMAGE_GENERATION_MODELS`                | The dispatch in `baseProvider.ts:819` doesn't fire — the model is treated as a chat model, gets a "model does not exist" error from the upstream chat endpoint                                        |
| Returned `imageBuffer` without `base64`                                | `ImageGenService.extractImageFromResult` checks both; missing one breaks downstream consumers that prefer one over the other                                                                          |
| Hardcoded `mimeType: "image/png"` for a JPEG-returning provider        | Magic-byte detection in `extractImageFromResult` falls back if the type is wrong, but downstream file extension routing still misroutes                                                               |
| Forgot to set `output: { format: "binary" }` (or omit format entirely) | If the caller passes `output: { format: "json" }`, the dispatch at `baseProvider.ts:822` flips `requestsNonImageOutput` to true and the model is forced through chat completions instead of image gen |
| Implemented `numberOfImages` but provider doesn't support batches      | Either implement client-side N-times-loop with rate-limit awareness, or surface a friendly error for `numberOfImages > 1`                                                                             |
| Didn't handle the upstream's "content policy violation" error          | Map it to a non-retriable `NeuroLinkError` with `category: ErrorCategory.CONTENT_POLICY` so the surrounding retry logic doesn't spam                                                                  |

---

## Provider quirks

### OpenAI DALL-E

- DALL-E 3 max prompt: 4 000 chars. DALL-E 2: 1 000 chars.
- DALL-E 3 only generates 1 image per call; for batches, parallelise client-side.
- Sizes: DALL-E 3 supports `1024x1024`, `1024x1792`, `1792x1024`. DALL-E 2: `256x256`, `512x512`, `1024x1024`.

### Vertex Imagen

- `predictLongRunning` model — async with poll. (Same shape as Veo video gen.)
- Endpoint: `*-aiplatform.googleapis.com/v1/projects/.../locations/.../publishers/google/models/imagen-3.0-generate-001:predictLongRunning`
- Aspect ratios: `1:1`, `9:16`, `16:9`, `3:4`, `4:3`.
- Note: there's a known routing bug somewhere in `ImageGenService` for Vertex (referenced in Director's BLOCKERS.md) — investigate before extending Vertex image-gen.

### Stability AI / Stable Diffusion direct

- REST API at `https://api.stability.ai/v2beta/stable-image/generate/{model}`
- Models: SD 3.5 Large, SD 3.5 Medium, Stable Image Core, Stable Image Ultra.
- Returns binary PNG/JPEG directly (not base64-wrapped JSON).

### FLUX.1 (Black Forest Labs / Replicate)

- Through Replicate is easier — the BFL direct API is also pay-per-token via Replicate.
- Model identifier on Replicate: `black-forest-labs/flux-1.1-pro` (and variants).
- Async prediction — use the unified Replicate handler (see [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md)).

### Ideogram

- REST API at `https://api.ideogram.ai/v1`.
- Strong typography support — useful for posters, infographics.
- Synchronous response (no polling needed).

### Recraft

- REST API at `https://external.api.recraft.ai/v1`.
- Strong vector-graphic / illustration generation.
- Requires `style_id` for style control (look up via their dashboard).

---

## See also

- [`15-adding-llm-provider.md`](15-adding-llm-provider.md) — base LLM provider pattern (image-gen extends this)
- [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md) — Replicate covers FLUX, SD, etc. with one provider
- `src/lib/image-gen/ImageGenService.ts` — caller-facing wrapper
- `src/lib/image-gen/imageGenTools.ts` — built-in tool definition
- `src/lib/types/imageGen.ts` — type contract
- `docs/features/image-generation-streaming.md` — user-facing image-gen docs
