---
title: Venice AI Provider Guide
description: Venice AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `zai-org-glm-5-2`
keywords: venice, venice-ai, openai-compatible, tier 2, provider setup, glm, deepseek, kimi
---

# Venice AI Provider Guide

Venice AI is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/venice-ai.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** The catalog fields below were taken from Venice's own public pages and
> unauthenticated GET requests to `/models`, `/models/traits` and
> `/chat/completions` — no account was created and no API key was used to
> build it. `evidence.liveMatrix` is
> `null` until someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `venice-ai` (alias `venice`)
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the
  [chat-completions reference](https://docs.venice.ai/api-reference/endpoint/chat/completions)
  says "This endpoint is OpenAI-compatible"
- **Base URL**: `https://api.venice.ai/api/v1`
- **Default model**: `zai-org-glm-5-2`
- **Models in catalog**: 10 (curated from a 126-model live roster)
- **Streaming**: supported — the chat-completions reference documents a
  `stream` parameter: "Whether to stream back partial progress. Defaults to
  false."
- **Tool calling**: `model-dependent` — the
  [function-calling guide](https://docs.venice.ai/guides/features/function-calling)
  says "Function calling support is model-specific." and points to the
  `supportsFunctionCalling` field of the models API
- **Tools while streaming**: not declared (`false`) — no streamed tool-call
  request was made
- **Structured output**: supported — the
  [structured-responses guide](https://docs.venice.ai/guides/features/structured-responses)
  documents `response_format` with `json_schema`; it says "This functionality is
  not natively available for all models." and points to the
  `supportsResponseSchema` field of the models API
- **Structured output + tools together**: not declared (`false`) — the
  structured-responses guide says "Structured Outputs via response_format are
  not compatible with parallel function calls", and no combined request was
  made
- **Embeddings**: not declared on this catalog entry. Venice's
  API index (https://docs.venice.ai/llms.txt) lists an Embeddings endpoint, but
  NeuroLink's generic `ConfiguredOpenAICompatProvider` (the class Tier-2
  catalog entries use) does not implement `embed()`/`embedMany()`, so this flag
  tracks that, not the vendor's own API surface
- **Thinking**: declared (`true`) — the
  [reasoning-models guide](https://docs.venice.ai/guides/features/reasoning-models)
  documents a `reasoning_content` output field and a `reasoning_effort`
  parameter, and the roster carries a `supportsReasoning` flag per model
- **Billing**: `no-free-tier` — see [Billing](#billing) below
- **Key format**: none declared by Venice

---

## Quick Start

### 1. Get an API key

1. Visit: https://venice.ai/settings/api and select Generate New API Key; the API key guide lists "Sign in to your Venice account." under Before you start (https://docs.venice.ai/guides/getting-started/generating-api-key)
2. Copy the key when it is shown — the API key guide states "Venice will show the full API key one time." (https://docs.venice.ai/guides/getting-started/generating-api-key) — and paste it without a Bearer prefix or quotes (https://docs.venice.ai/getting-started/quick-start)
3. Fund the account before calling models: the docs state "model requests will not succeed until the account can consume DIEM, bundled credits, or USD" (https://docs.venice.ai/guides/getting-started/generating-api-key); payment options are listed at https://docs.venice.ai/overview/pricing
4. Set `VENICE_AI_API_KEY` in your .env file (`VENICE_API_KEY`, the variable Venice's own docs use, is also read)

### 2. Configure

```bash
export VENICE_AI_API_KEY=your-api-key
export VENICE_AI_MODEL=zai-org-glm-5-2   # optional — overrides the default model
export VENICE_AI_BASE_URL=https://api.venice.ai/api/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "venice-ai",
  model: "zai-org-glm-5-2",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider venice-ai
```

Per-request credentials work the same way as on the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "venice-ai",
  credentials: { veniceAi: { apiKey: process.env.VENICE_AI_API_KEY } },
});
```

---

## Billing

What the pages opened on 2026-09-29 say:

- The [API key guide](https://docs.venice.ai/guides/getting-started/generating-api-key)
  says "You can create a key before funding the account, but model requests will
  not succeed until the account can consume DIEM, bundled credits, or USD."
- The [pricing page](https://docs.venice.ai/overview/pricing) lists three
  payment options. The USD card says "Buy Venice credits with credit card.
  Credits never expire." The Stake DIEM card says "Each Diem = $1/day of credits that
  refresh daily."
- Venice's [plan page](https://venice.ai/pricing) lists "API Access (pay with
  credits)" under the Free plan.
- Venice's [API page](https://venice.ai/venice-api) shows the tag "Free tier,
  no card" in its hero section, and a Pay as you go card that lists "Add funds only
  when needed".

The entry records `no-free-tier`, following the documented balance requirement
in the first bullet.

---

## Models

| Model                   | Context   | Max output | Vision | $/M in · out (cache read) | Notes                                                                                                                                                                     |
| ----------------------- | --------- | ---------- | ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zai-org-glm-5-2` ⭐    | 1,000,000 | 131,072    | no     | $1.4 / $4.4 ($0.26)       | NeuroLink default. Roster traits "default" and "function_calling_default"; the `/models/traits` GET returned "default":"zai-org-glm-5-2".                                 |
| `zai-org-glm-5`         | 198,000   | 32,000     | no     | $1 / $3.2 ($0.2)          | Fallback. The quick-start page lists it with the text "Default model for most use cases".                                                                                 |
| `zai-org-glm-5-1`       | 200,000   | 80,000     | no     | $1.54 / $4.84 ($0.286)    | Fallback. The model in the reasoning-models examples.                                                                                                                     |
| `deepseek-v4-pro-0813`  | 1,000,000 | 32,768     | no     | $1.65 / $4.95 ($0.165)    | Fallback. Roster trait "default_code".                                                                                                                                    |
| `kimi-k3`               | 1,000,000 | 131,072    | yes    | $3.75 / $18.75 ($0.375)   | Roster trait "default_reasoning".                                                                                                                                         |
| `kimi-k2-6`             | 256,000   | 65,536     | yes    | $0.75 / $3.5 ($0.16)      | The quick-start page lists it with the text "Strong reasoning for more complex tasks".                                                                                    |
| `qwen3-vl-235b-a22b`    | 128,000   | 16,384     | yes    | $0.21 / $1.9 ($0.1)       | The model in the vision guide's examples; `models.visionModel`.                                                                                                           |
| `venice-uncensored-1-2` | 128,000   | 8,192      | yes    | $0.2 / $0.9               | Roster trait "most_uncensored"; the quick-start page lists it with the text "Venice's uncensored model".                                                                  |
| `grok-4-7`              | 500,000   | 200,000    | yes    | $2.27 / $6.8 ($0.57)      | Roster trait "most_intelligent". The pricing page has a further row labelled "↳ >200K Context" at $4.53 input and $13.60 output, which the flat prices here do not carry. |
| `claude-opus-4-8`       | 1,000,000 | 128,000    | yes    | $6 / $30 ($0.6)           | The quick-start page lists it with the text "High-intelligence model for complex tasks". Roster privacy "anonymized".                                                     |

Context, max output, vision and prices come from an unauthenticated
`GET https://api.venice.ai/api/v1/models` call made 2026-09-29 (126 text models
total; 10 curated into this catalog; the roster's `e2ee-` ids are not in it).
The input and output prices and the rounded context also appear on
[the pricing page](https://docs.venice.ai/overview/pricing) and
[the text-models page](https://docs.venice.ai/models/text); the pricing page
shows cache-read prices rounded to two decimals. "Roster trait" means the id
appears in the model's `traits` list on the roster; the
[deprecations page](https://docs.venice.ai/overview/deprecations) lists the
current trait mapping. The text-models page lists each model's Capabilities, for
example "Function calling, Reasoning, Vision, Code" for `kimi-k3`.

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(4,096) are placeholders the vendor does not publish: Venice publishes context
and max-output figures per model on the roster, not as a general default.

**Fallback order** when the default is unavailable:
`zai-org-glm-5` → `zai-org-glm-5-1` → `deepseek-v4-pro-0813`. The runtime
fallback model name the loader derives (`fallbacks[1]`) is `zai-org-glm-5-1`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Venice AI — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /models`, HTTP 200, 126 text models, 2026-09-29 — no key used                                                                                                                                                                                                                                                                                                                   |
| Default model             | unauthenticated `GET /models/traits`, HTTP 200, 2026-09-29 — returned `"default":"zai-org-glm-5-2"`                                                                                                                                                                                                                                                                                                  |
| Billing                   | public pages quoted in [Billing](#billing) above, 2026-09-29 — recorded as `no-free-tier`                                                                                                                                                                                                                                                                                                            |
| Auth-failure shape        | an unauthenticated `GET /chat/completions` returned HTTP 404 with body `{"error":"Not found"}` on 2026-09-29; no request that fails authentication was made. `errorRules` use the statuses and messages listed on the [error-codes page](https://docs.venice.ai/api-reference/error-codes): 401, 402, 429, and the model-not-found messages ("Specified model not found", "Invalid model specified") |
| Tools / structured output | documented on the function-calling and structured-responses guides linked above; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                               |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=venice-ai` with a real key and record the result.                                                                                                                                                                             |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row is what a Venice page states; none was reproduced live.

| Symptom                                       | Cause                                                                                                                                                                                                                                                                                           | Fix                                                                                                                                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 401                                      | The [API key guide](https://docs.venice.ai/guides/getting-started/generating-api-key) says a 401 with `AUTHENTICATION_FAILED` means the key itself was rejected, and lists a partial copy, a `Bearer` prefix or quotes captured into the value, or a stray space or newline as the usual causes | The [quick-start page](https://docs.venice.ai/getting-started/quick-start) says to paste the key exactly as Venice issued it, with no `Bearer` prefix, on a single line with no quotes                                        |
| HTTP 402                                      | The [error-codes page](https://docs.venice.ai/api-reference/error-codes) lists `INSUFFICIENT_BALANCE` and two per-key spend-limit codes under 402; the API key guide says that with a spend-limit code "the cause is the key's own limit rather than your account balance"                      | For `INSUFFICIENT_BALANCE` the error-codes page points to https://venice.ai/settings/api to add credits; for a spend-limit code the API key guide says to raise or remove the key's Epoch Consumption Limits at the same page |
| HTTP 429                                      | `RATE_LIMIT_EXCEEDED` or `MODEL_OVERLOADED` on the error-codes page; the [rate-limiting page](https://docs.venice.ai/api-reference/rate-limiting) also lists two 30-second error budgets, 50 failed requests and 200 unsupported-feature requests, each returning 429                           | The rate-limiting page says "Failed requests (500, 503, 429) should be retried with exponential backoff." and to check the `x-ratelimit-reset-requests` header for the time you can retry                                     |
| HTTP 504 on a long non-streaming request      | `REQUEST_TIMEOUT` on the error-codes page                                                                                                                                                                                                                                                       | The error-codes page says to use the streaming API by setting `stream=true` for long-running non-streaming inference requests                                                                                                 |
| Model not found                               | `MODEL_NOT_FOUND` (404, "Specified model not found") or `INVALID_MODEL` (400, "Invalid model specified") on the error-codes page                                                                                                                                                                | Model ids are served by the unauthenticated `GET https://api.venice.ai/api/v1/models` ([List Models](https://docs.venice.ai/api-reference/endpoint/models/list))                                                              |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry; the structured-responses guide says structured outputs are not compatible with parallel function calls                                                                                                                                    | The generic provider suppresses `response_format` when tools are attached (the default for entries without `structuredOutputWithTools: true`)                                                                                 |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
