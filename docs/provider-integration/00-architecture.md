# 00 · Native Provider Architecture

Start a new integration at [Provider Onboarding Tiers](tiers/README.md). This
page describes the current runtime; the original SDK-wrapper implementation
remains in git history at `c829f4de`. NeuroLink no longer depends on the Vercel
`ai` or `@ai-sdk/*` packages.

## Choose the integration boundary

| Situation                                                           | Implementation                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Model already available through an existing aggregator              | Tier 1: configure its model ID                                                 |
| Standard OpenAI chat-completions protocol without behavioral quirks | Tier 2: `src/lib/providers/catalog/<id>.json`, then `pnpm run codegen:catalog` |
| OpenAI-compatible transport with request or error quirks            | Extend `OpenAIChatCompletionsProvider` and override the relevant hooks         |
| Native SDK, signing, or nonstandard lifecycle                       | Follow the Tier 3 or Tier 4 guide; preserve both public generation modes       |

Catalog entries generate metadata; do not separately hand-edit generated enums,
credential keys, or provider choices. Native providers remain registered using
**dynamic imports inside factory functions** in `providerRegistry.ts`.

## Generate and stream are distinct paths

For the OpenAI-compatible family:

- `generate()` runs `runNativeGenerateLoop` over the provider's `doGenerate`.
  The ordinary wire request is JSON, not SSE; provider-specific streaming-wire
  exceptions stay inside the delegating model.
- `stream()` drives the native HTTP/SSE loop in `executeStream`. It emits
  incremental content and reasoning, executes tool calls, and exposes usage.
- Both modes must preserve credentials, abort signals, timeouts, tool-name
  mapping, request repair, fallback policy, and structured-output behavior.
  A passing stream test does not prove the non-streaming request body.

The internal names `getAISDKModel` and `LanguageModelV3` remain compatibility
names. Their implementations and types are local to NeuroLink; they do not
imply a dependency on the Vercel SDK. A method-shaped `doStream` member alone
is not proof that a model handle can stream: test the call itself.

## Shared OpenAI-compatible hooks

The base lives in `src/lib/providers/openaiChatCompletionsBase.ts` and shares
wire helpers from `openaiChatCompletionsClient.ts`. Subclasses should customize
these hooks rather than duplicate the full generation pipeline.

| Hook                                      | Responsibility                                            |
| ----------------------------------------- | --------------------------------------------------------- |
| `getProviderName`, `getDefaultModel`      | Provider identity and default model                       |
| `formatProviderError`                     | Return a classified error; never throw from the formatter |
| `getChatCompletionsURL`, `getAuthHeaders` | Endpoint and authentication variations                    |
| `adjustBuildBodyOptions`                  | Sampling changes and the `extraBody` channel              |
| `adjustRequestBody(body, modelId)`        | Final provider-specific wire-body transformation          |
| `adjustResponseFormat`                    | Structured-output format changes                          |
| `adjustBodyAfter400`                      | One corrected retry for a recognized bad request          |
| `getFallbackModels`                       | Alternatives for unavailable model IDs                    |
| `onStreamStart`                           | Provider-specific streaming lifecycle instrumentation     |
| `validateConfiguration`                   | Provider configuration/reachability validation            |

Examples: [DeepSeek](02-deepseek.md) downgrades `json_schema` to `json_object`;
[NVIDIA NIM](03-nvidia-nim.md) sends native extra fields and repairs specific
400 responses; [LM Studio](04-lm-studio.md) and [llama.cpp](05-llamacpp.md)
provide local model discovery and friendly connection errors.

## Credentials and proxy support

Credentials flow through `NeuroLink` → provider factory → registry → provider
constructor. Precedence is per-call credentials, instance credentials, then
environment defaults. Exact handling of blank values is provider-specific;
copy the neighboring implementation rather than inventing a second resolver.
The OpenAI-compatible base obtains corporate-proxy support from
`createProxyFetch()`.

Do not print keys or credential-bearing URLs. Use the existing log-redaction
helpers. Local backends may use placeholder bearer keys; a reverse proxy can
require real credentials, so preserve explicit overrides.

## Types and public surfaces

Use named exports and `type`, not `interface`. Keep shared types in
`src/lib/types/` with unique names, importing internal types through its barrel.
Do not use double assertions to conceal an incompatible model shape.

Keep existing public signatures working. Changes to browser factories, client
adapters, generated declarations, and lifecycle callbacks need their own
consumer-boundary checks; a provider HTTP test does not cover those surfaces.

## Verification

Build first, then use the shipped SDK/CLI, not a second source module graph.
At minimum exercise both modes for plain text, tools, error propagation,
abort/timeout, and any provider-specific schema behavior. Assert that a mock
server actually received the request before claiming a network-side effect.

Useful commands:

```bash
pnpm run build
pnpm run check:deps
pnpm run check:dts
pnpm run test:providers-mocked
pnpm run test:error-classification-e2e
pnpm run test:openai-compat-streaming-retry
pnpm run test:adjust-body-after-400
pnpm run test:new-providers
```

The first contract suites use deterministic stand-ins; the new-provider suite
also needs live credentials or local servers for relevant cases. Report skips
and unavailable endpoints separately from passes. The live matrix complements
wire-level tests; it cannot establish every branch on its own.
