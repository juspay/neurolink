# Provider / Modality Integration Checklist

A condensed, pasteable PR checklist. Copy the relevant section into your PR description and tick items off as you implement them.

For full context on any line, follow the link to the matching guide.

---

## Decision

What are you adding?

- [ ] **A new LLM / chat provider** → use [§A](#a--new-llm-provider-12-files)
- [ ] **A new TTS provider** → use [§B](#b--new-tts-provider-6-files)
- [ ] **A new STT provider** → use [§C](#c--new-stt-provider-6-files)
- [ ] **A new realtime / bidirectional voice provider** → use [§D](#d--new-realtime-provider-6-files)
- [ ] **A new video provider** → §E (requires §E0 first if no `VideoHandler` exists yet)
- [ ] **A new image-gen provider** → use [§F](#f--new-image-gen-provider-3-or-12-files)
- [ ] **An entirely new modality (Avatar, Music, …)** → use [§G](#g--new-modality-11-files)
- [ ] **A multi-modal provider (Replicate-style)** → use [§H](#h--multi-modal-provider-1-shared-helper--per-modality-handlers)

---

## §A — New LLM provider (12 files)

Full guide: [`15-adding-llm-provider.md`](15-adding-llm-provider.md)

**Code (12 files):**

- [ ] `src/lib/providers/<name>.ts` — NEW provider class extending `BaseProvider`
- [ ] `src/lib/constants/enums.ts` — add to `AIProviderName` + add `<Name>Models` enum
- [ ] `src/lib/types/providers.ts` — extend `NeurolinkCredentials` with `<key>?: { apiKey?, baseURL? }`
- [ ] `src/lib/utils/providerConfig.ts` — add `create<Name>Config()` helper
- [ ] `src/lib/factories/providerRegistry.ts` — add registration block (dynamic import)
- [ ] `src/lib/providers/index.ts` — add re-export
- [ ] `src/lib/constants/contextWindows.ts` — add `<provider>: { _default, ... }` block
- [ ] `src/lib/utils/modelChoices.ts` — `TOP_MODELS_CONFIG` + `DEFAULT_MODELS` rows
- [ ] `src/lib/adapters/providerImageAdapter.ts` — add `VISION_CAPABILITIES` entry
- [ ] `src/cli/factories/commandFactory.ts` — 3 spots (provider choices, secondary, bash completion)
- [ ] `.env.example` — append env-var section
- [ ] `src/lib/utils/pricing.ts` — add per-1K-token cost entries

**Tests:**

- [ ] `test/continuous-test-suite-providers.ts` — add to `ALL_PROVIDERS`
- [ ] `test/continuous-test-suite-credentials.ts` — add per-call credential test
- [ ] `test/continuous-test-suite-new-providers.ts` — add full feature suite section (generate, stream, tools, structured output, abort, timeout, telemetry, error formatting)
- [ ] If small context window (≤8 192): update `PROVIDER_MAX_TOKENS` in 12 test files (see §14d in [`15-adding-llm-provider.md`](15-adding-llm-provider.md))

**Docs:**

- [ ] `docs/getting-started/providers/<name>.md` — NEW per-provider guide
- [ ] `docs/getting-started/providers/index.md` — add card
- [ ] `docs/getting-started/provider-setup.md` — add to index
- [ ] `docs/getting-started/environment-variables.md` — document new env vars
- [ ] `docs/reference/provider-comparison.md` — add row
- [ ] `docs/reference/provider-selection.md` — mention in decision tree
- [ ] `docs/reference/provider-feature-compatibility.md` — capability columns
- [ ] `README.md` — update provider count + table
- [ ] `docs-site/sidebars.ts` — add doc to sidebar
- [ ] (Optional) `docs/provider-integration/<NN>-<name>.md` — implementation journal for non-trivial providers

**Validation:**

- [ ] `pnpm run check` — 0 errors
- [ ] `pnpm run lint` — 0 errors (rules 7-13 enforced)
- [ ] `pnpm run build` — clean
- [ ] `pnpm run test:new-providers` — green
- [ ] CLI smoke test passes (`pnpm run cli generate "..." --provider <name>`)

---

## §B — New TTS provider (6 files)

Full guide: [`16-adding-tts-provider.md`](16-adding-tts-provider.md)

**Code (6 files):**

- [ ] `src/lib/voice/providers/<Name>TTS.ts` — NEW handler implementing `TTSHandler`
- [ ] `src/lib/factories/providerRegistry.ts` — registration block in TTS section (try/catch, dynamic import)
- [ ] `src/lib/voice/index.ts` — re-export class + `<Name>TTSHandler` alias
- [ ] `src/lib/types/voice.ts` — add to `VoiceProviderName` union; add `<Name>TTSOptions` if provider has unique options
- [ ] `.env.example` — env vars (`<NAME>_API_KEY`)
- [ ] `test/continuous-test-suite-voice.ts` — add test section

**Implementation contract:**

- [ ] Constructor `(apiKey?: string)` with env-var fallback
- [ ] `isConfigured(): boolean`
- [ ] `synthesize(text, options): Promise<TTSResult>` with 30s `AbortController` timeout
- [ ] Throws `TTSError` (not `Error`) with proper `category` / `severity` / `retriable`
- [ ] `effectiveFormat()` mapping (don't return requested format if upstream coerced)
- [ ] Map non-retriable HTTP statuses (4xx auth/input) to `retriable: false`
- [ ] (Optional) `getVoices(languageCode?): Promise<TTSVoice[]>` with caching
- [ ] (Optional) `maxTextLength` field if provider has a limit other than 3000

**Docs:**

- [ ] `docs/getting-started/providers/<name>.md` — NEW per-provider guide
- [ ] `docs/features/tts.md` — add row to "Supported providers" table
- [ ] `docs/reference/provider-comparison.md` — add to TTS section
- [ ] `docs/getting-started/providers/index.md` — add card

**Validation:**

- [ ] `pnpm run check && pnpm run lint && pnpm run build`
- [ ] `pnpm run test:voice` — green
- [ ] `pnpm run cli generate "Hello" --tts --tts-provider <name>` — produces valid audio

---

## §C — New STT provider (6 files)

Full guide: [`17-adding-stt-provider.md`](17-adding-stt-provider.md)

**Code (6 files):**

- [ ] `src/lib/voice/providers/<Name>STT.ts` — NEW handler implementing `STTHandler`
- [ ] `src/lib/factories/providerRegistry.ts` — registration block in STT section
- [ ] `src/lib/voice/index.ts` — re-export class
- [ ] `src/lib/types/voice.ts` — add to `VoiceProviderName` union
- [ ] `.env.example` — env vars
- [ ] `test/continuous-test-suite-voice.ts` — add test section

**Implementation contract:**

- [ ] Constructor `(apiKey?: string)` with env-var fallback
- [ ] `isConfigured(): boolean`
- [ ] `transcribe(audio: Buffer | string, options): Promise<STTResult>` — handle Buffer AND path
- [ ] 30s `AbortController` timeout
- [ ] Throws `STTError` via static factories (`audioEmpty`, `audioTooLong`, `transcriptionFailed`, `providerNotConfigured`, …)
- [ ] Set `confidence` from upstream when available; document fallback (`0.95` for Whisper)
- [ ] Optional `transcribeStream` for WebSocket-based providers; `supportsStreaming` flag
- [ ] `maxAudioDuration` and `supportedFormats` fields where applicable

**Docs:**

- [ ] `docs/getting-started/providers/<name>.md` — NEW
- [ ] `docs/features/audio-input.md` — list new provider
- [ ] `docs/reference/provider-comparison.md` — STT section row

**Validation:**

- [ ] `pnpm run check && pnpm run lint && pnpm run build`
- [ ] `pnpm run test:voice` — green
- [ ] Smoke test both audio-only and audio + text paths (different failure semantics)

---

## §D — New realtime provider (6 files)

Full guide: [`18-adding-realtime-provider.md`](18-adding-realtime-provider.md)

**Code (6 files):**

- [ ] `src/lib/voice/providers/<Name>Realtime.ts` — NEW handler extending `BaseRealtimeHandler`
- [ ] `src/lib/factories/providerRegistry.ts` — registration block in realtime section (logger.error on failure)
- [ ] `src/lib/voice/index.ts` — re-export class
- [ ] `src/lib/types/voice.ts` — add to `VoiceProviderName` union
- [ ] `.env.example` — env vars
- [ ] `test/continuous-test-suite-voice-server.ts` — add test section

**Implementation contract:**

- [ ] Use `ws` (npm package) — not native `WebSocket`
- [ ] `setState("connecting")` → `"connected"` → `"disconnected"` lifecycle
- [ ] `connect(config): Promise<RealtimeSession>` opens WebSocket and resolves on `open` event
- [ ] `send(audio: RealtimeAudioChunk): Promise<void>` — validates state, sends provider-specific envelope
- [ ] `disconnect(): Promise<void>` — closes WS cleanly with code 1000
- [ ] Maps upstream events → standard events (`audio`, `text`, `response_complete`, `error`, `disconnect`)
- [ ] Throws `RealtimeError` via static factories (`connectionFailed`, `sessionAlreadyActive`, `sessionNotActive`, `protocolError`)

**Docs:**

- [ ] `docs/getting-started/providers/<name>.md` — NEW
- [ ] `docs/features/voice-agent.md` — add to supported providers
- [ ] `docs/features/real-time-services.md` — protocol summary

**Validation:**

- [ ] `pnpm run check && pnpm run lint && pnpm run build`
- [ ] `pnpm run test:servers` — voice-server integration tests green
- [ ] Verify registration outcome via `ProviderRegistry.getRegistrationReport()`

---

## §E — New video provider

Full guide: [`19-adding-video-provider.md`](19-adding-video-provider.md)

### §E0 — One-time refactor (only if not done already)

Required before any non-Vertex video provider can be added.

- [ ] `src/lib/types/video.ts` — NEW (move shared types, add `VideoHandler` and `VideoTransitionOptions`)
- [ ] `src/lib/utils/videoProcessor.ts` — NEW (registry mirror of `TTSProcessor`)
- [ ] `src/lib/types/span.ts` — add `SpanType.VIDEO`
- [ ] `src/lib/types/multimodal.ts` — add `provider?: string` to `VideoOutputOptions`
- [ ] `src/lib/types/index.ts` — `export * from "./video.js"`
- [ ] `src/lib/adapters/video/vertexVideoHandler.ts` — add `VertexVideoHandler` class wrapping existing functions; keep functions exported for backwards compat
- [ ] `src/lib/core/baseProvider.ts:1755` — replace hardcoded import with `VideoProcessor.generate(provider, ...)` call
- [ ] `src/lib/adapters/video/directorPipeline.ts:289` — same swap
- [ ] `src/lib/factories/providerRegistry.ts` — register `vertex` in new VIDEO HANDLER block
- [ ] `src/cli/factories/commandFactory.ts:2450` — add `--video-provider` flag
- [ ] `test/continuous-test-suite-media-gen.ts` — registry sanity tests; existing Vertex tests must keep passing

### §E1 — Per-provider (after §E0)

- [ ] `src/lib/adapters/video/<name>VideoHandler.ts` — NEW (implements `VideoHandler`)
- [ ] `src/lib/factories/providerRegistry.ts` — add registration entry
- [ ] `.env.example` — env vars
- [ ] `test/continuous-test-suite-media-gen.ts` — provider-specific test
- [ ] `docs/getting-started/providers/<name>.md` — NEW
- [ ] `docs/features/video-generation.md` — add to supported providers

**Implementation contract:**

- [ ] `generate(image, prompt, options, region?): Promise<VideoGenerationResult>`
- [ ] (Optional) `generateTransition(...)` for first-and-last-frame interpolation
- [ ] `isConfigured(): boolean`
- [ ] `maxDurationSeconds`, `supportedAspectRatios`, `supportedResolutions` declared
- [ ] Total timeout cap on polling (don't hang forever)
- [ ] Throws `VideoError` from `videoProcessor.ts`

---

## §F — New image-gen provider (3 or 12 files)

Full guide: [`20-adding-image-gen-provider.md`](20-adding-image-gen-provider.md)

> **Insight**: image-gen is dispatched through LLM providers, not a separate handler. The decision below depends on whether you're adding a fresh provider or just new models.

### §F1 — New full LLM provider with image-gen capability (12+ files)

- [ ] All of §A (LLM provider checklist)
- [ ] Override `executeImageGeneration` in the provider class
- [ ] Add model-name prefix to `IMAGE_GENERATION_MODELS` constant
- [ ] Add to `ImageGenProvider` type in `src/lib/types/imageGen.ts:15`
- [ ] `VISION_CAPABILITIES` reflects reference-image support (input)

### §F2 — Image-only provider (12 files)

- [ ] All of §A but `executeStream` throws a friendly "image gen only" error
- [ ] `supportsTools()` returns `false`
- [ ] Same image-gen wiring as §F1

### §F3 — New model on existing provider (3 files)

- [ ] Add model name to `IMAGE_GENERATION_MODELS`
- [ ] Add constant in `src/lib/models/<provider>.ts`
- [ ] (If model-specific options) Update existing `executeImageGeneration` override
- [ ] Add row to existing per-provider doc
- [ ] Add test in `test/continuous-test-suite-media-gen.ts`

---

## §G — New modality (11 files)

Full guide: [`21-adding-new-modality.md`](21-adding-new-modality.md)

For a brand-new category like Avatar, Music, 3D, etc.

**Code (8 files):**

- [ ] `src/lib/types/<modality>.ts` — NEW (handler interface, options, result types)
- [ ] `src/lib/utils/<modality>Processor.ts` — NEW (registry + dispatch)
- [ ] `src/lib/types/span.ts` — add `SpanType.<MODALITY>`
- [ ] `src/lib/types/index.ts` — `export *` for new type file
- [ ] `src/lib/types/generate.ts` — add `<modality>` to `output.mode` union (BOTH locations); add `output.<modality>` config block; add `result.<modality>` field
- [ ] `src/lib/<modality>/providers/<First>Provider.ts` — NEW first handler
- [ ] `src/lib/<modality>/index.ts` — NEW barrel
- [ ] `src/lib/core/baseProvider.ts` — add `if (mode === <modality>) return handle<Modality>Generation(...)` dispatch + new method (mirror `handleVideoGeneration`)

**Wiring (3 files):**

- [ ] `src/lib/factories/providerRegistry.ts` — registration block (try/catch, dynamic imports)
- [ ] `src/cli/factories/commandFactory.ts` — `output-mode` choice extension + new flags
- [ ] `package.json` — add `test:<modality>` script

**Tests:**

- [ ] `test/continuous-test-suite-<modality>.ts` — NEW (mirror voice suite shape)
- [ ] Tests cover: handler registration, generate happy path, missing-config error, format validation

**Docs:**

- [ ] `docs/features/<modality>.md` — NEW user-facing feature page
- [ ] `docs/getting-started/providers/<provider>.md` — NEW per-provider guide
- [ ] `docs/features/index.md` — add link
- [ ] `docs/reference/provider-comparison.md` — add modality section
- [ ] `README.md` — mention new modality
- [ ] `docs-site/sidebars.ts` — add new pages
- [ ] (Recommended) `docs/provider-integration/<NN>-<modality>-integration.md` — implementation journal

**Type-naming check (CLAUDE.md rule 9):**

- [ ] No bare `Options`, `Handler`, `Result` — prefix with `<Modality>` (e.g., `AvatarOptions`)
- [ ] Run `pnpm run lint` early to catch `unique-type-names` errors

---

## §H — Multi-modal provider (1 shared helper + per-modality handlers)

Full guide: [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md)

**Prerequisites:**

- [ ] All target modalities exist as registries (TTS / STT / Realtime exist; Video requires §E0; new modalities require §G)

**Shared infra (3 files):**

- [ ] `src/lib/adapters/<provider>/predictionLifecycle.ts` — NEW shared async-job helper (`createPrediction`, `pollPrediction`, `predict`, `downloadPredictionOutput`)
- [ ] `src/lib/adapters/<provider>/auth.ts` — NEW shared auth helper (`get<Provider>Auth()`)
- [ ] (Optional) `src/lib/adapters/<provider>/<provider>Client.ts` — low-level client

**LLM flavor (per §A):**

- [ ] Full §A checklist (12 files), but `executeStream` and `executeImageGeneration` use the shared lifecycle helper
- [ ] Add image-gen model prefixes to `IMAGE_GENERATION_MODELS` (`flux`, `sdxl`, etc. for Replicate)

**Video flavor:**

- [ ] `src/lib/adapters/video/<provider>VideoHandler.ts` — NEW (implements `VideoHandler`, calls shared lifecycle)
- [ ] Register in providerRegistry.ts video block

**Avatar flavor:**

- [ ] `src/lib/avatar/providers/<Provider>Avatar.ts` — NEW (implements `AvatarHandler`)
- [ ] Register in providerRegistry.ts avatar block

**Music flavor (when Music modality exists):**

- [ ] `src/lib/music/providers/<Provider>Music.ts` — NEW
- [ ] Register in providerRegistry.ts music block

**Tests:**

- [ ] `test/continuous-test-suite-<provider>.ts` — NEW (cross-modality suite covering each flavor)
- [ ] Add `test:<provider>` script to `package.json`

**Docs:**

- [ ] `docs/getting-started/providers/<provider>.md` — NEW (covers all 4+ flavors in one guide)
- [ ] `docs/provider-integration/<NN>-<provider>-integration.md` — NEW implementation journal documenting the multi-modal architecture
- [ ] Cross-reference updates per modality (video-generation.md, image-generation-streaming.md, etc.)

**Pricing nuance:**

- [ ] Decide between symbolic per-token rate or compute-time billing (Replicate uses compute-seconds, not tokens — see §22 pricing nuance)

---

## Universal safety items (apply to every provider / modality)

These items are mandatory regardless of which section above you're working from. They catch the classes of bug found in PR #1019's post-merge review — every one of which was discoverable at PR time with a checklist line.

**Full reference + examples for every helper below: [`SAFETY-PRIMITIVES.md`](SAFETY-PRIMITIVES.md).**

- [ ] **`formatProviderError` returns typed errors** (`AuthenticationError`, `RateLimitError`, `InvalidModelError`, `NetworkError`, `ProviderError`) or `NeuroLinkError` — never plain `new Error(...)`. `baseProvider.handleProviderError` switches on the typed hierarchy via `instanceof` and sets `error.type` on OTel spans for observability fidelity. Enforced by ESLint rule `neurolink/provider-typed-errors`.
- [ ] **All caller-influenced URL downloads go through `safeDownload`** from `src/lib/utils/safeFetch.ts`. Direct `fetch(url)` is unsafe — it skips SSRF validation and IP pinning. `safeDownload` combines `assertSafeUrl` + undici-pinned dispatcher + `redirect: "manual"` + `readBoundedBuffer`. (Replicate-based handlers can go through `predictionLifecycle.downloadPredictionOutput`, which uses `safeDownload` internally.)
- [ ] **HTTP response bodies are sanitised** via `sanitizeForLog` (`src/lib/utils/logSanitize.ts`) before logging or embedding in error messages. The centralised helper covers all provider token prefixes (`r8_`, `gsk_`, `xai-`, `tgp_`, `fw_`, `pplx-`, `pa-`, `jina_`, `fish-`, `sk-`, `pk-`), three auth schemes (`Bearer`, `Token`, `Basic`), and generic `api_key=…` patterns. For structured payloads use `sanitizeRecord` / `sanitizeHeaders`. Inline secret regexes blocked by ESLint rule `neurolink/no-inline-secret-regex`.
- [ ] **Streaming spans use `withClientStreamSpan`** from `src/lib/telemetry/withSpan.ts`, NOT `withClientSpan`. The plain `withSpan` family ends spans when the callback resolves; for streaming this captures setup time only and reports zero tokens. `withClientStreamSpan` extends the span until the consumer reaches end-of-stream / error / abort.

  ```ts
  return withClientStreamSpan(
    { name: "neurolink.provider.stream", tracer: tracers.provider, attributes: {...} },
    async () => this.executeStreamInner(options),
    (r) => r.stream,
    (r, wrapped) => ({ ...r, stream: wrapped }),
  );
  ```

- [ ] **SDK reference validated via `isNeuroLink(sdk)`** from `src/lib/neurolink.js` — NOT duck-type via `"getInMemoryServers" in sdk`. The brand check (`Symbol.for("@juspay/neurolink/sdk-brand")`) survives minification and isn't tied to method names.
- [ ] **Logging fetch wrappers use `createLoggingFetch`** from `src/lib/utils/loggingFetch.ts`. Don't hand-roll the wrap-and-log pattern; the shared helper already sanitises bodies under `NEUROLINK_DEBUG_HTTP=1`.
- [ ] **Run the regression suites**: `pnpm run test:ssrf && pnpm run test:log-sanitize && pnpm run test:stream-span` — all three are offline (no API keys needed) and cover the bypass / drift classes found in this PR's review.

---

## Universal validation gates (run for every PR)

```bash
pnpm run check                  # type-check
pnpm run lint                   # ESLint (rules 7-13)
pnpm run build                  # full SDK + CLI build
pnpm run test:<relevant-suite>  # the matching test:* script
```

If `pnpm run lint` complains:

| Error                          | Fix                                                  |
| ------------------------------ | ---------------------------------------------------- |
| `no-interface`                 | Convert `interface X { ... }` → `type X = { ... }`   |
| `unique-type-names`            | Add a domain prefix                                  |
| `no-types-suffix-filename`     | Rename file (no `Types` suffix)                      |
| `no-local-types-folder`        | Move to `src/lib/types/`                             |
| `barrel-type-imports`          | Import from `../types/index.js`, not specific files  |
| `no-type-export-outside-types` | Don't `export type {} from` outside `src/lib/types/` |

---

## End-to-end verification

For every new provider/modality, run a full smoke test against real APIs in the form documented in the matching guide. CI alone is insufficient because env-gated providers skip without keys.

```bash
# LLM
pnpm run cli generate "Hello" --provider <name>

# TTS
pnpm run cli generate "Hello" --tts --tts-provider <name>

# STT
pnpm run cli generate --stt --stt-provider <name> --input-audio recording.wav

# Video
pnpm run cli generate "..." --provider <name> --output-mode video --output-video out.mp4

# Image
pnpm run cli generate "..." --provider <name> --model <image-model> --output-image out.png

# Avatar / Music
# (use the modality-specific flags added in §G step 9)
```

Capture outputs and verify magic bytes / playable artifacts before merging.
