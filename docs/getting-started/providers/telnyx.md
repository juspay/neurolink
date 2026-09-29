---
title: Telnyx Provider Guide
description: Telnyx on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `zai-org/GLM-5.3-Flash`
keywords: telnyx, openai-compatible, tier 2, provider setup, glm, kimi, deepseek
---

# Telnyx Provider Guide

Telnyx is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/telnyx.json`) rather than hand-written code.
That file is the source of truth for this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** Telnyx's `GET /v2/ai/openai/models` needs a key (it answers
> HTTP 401 without one), so the model ids come from Telnyx's public models page
> and the roster has not been checked. No account was created and no API key
> was used to build this entry. `evidence.liveMatrix` is `null` until someone
> runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `telnyx`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the
  [Quickstart](https://developers.telnyx.com/docs/inference/getting-started)
  says "The Inference API is OpenAI-compatible."
- **Base URL**: `https://api.telnyx.com/v2/ai/openai`
- **Default model**: `zai-org/GLM-5.3-Flash` — NeuroLink default. The
  [models page](https://developers.telnyx.com/docs/inference/models) tags it
  "(Recommended)", and the Quickstart's first chat-completions example uses it
- **Models in catalog**: 9 — the nine chat models the models page lists on
  2026-09-29
- **Streaming**: supported — the Quickstart's Streaming section says
  "Server-sent events, same as OpenAI."
- **Tool calling**: `true` — the
  [Function Calling page](https://developers.telnyx.com/docs/inference/functions)
  says "While we recommend you start with this model, every model in our API
  supports the tools interface."
- **Tools while streaming**: `true` — the
  [Streaming and Parallel Calls page](https://developers.telnyx.com/docs/inference/streaming-functions)
  shows a streamed chat completion with `tools` on `zai-org/GLM-5.3-Flash`
- **Structured output**: `true` — the
  [JSON Mode page](https://developers.telnyx.com/docs/inference/json-mode)
  documents `response_format` with `json_schema` and with `json_object`
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared on this catalog entry. The models page lists
  three embedding models on `POST /v2/ai/openai/embeddings`, but NeuroLink's
  generic `ConfiguredOpenAICompatProvider` (which every Tier-2 catalog entry
  uses) does not implement `embed()`/`embedMany()`, so this flag tracks that,
  not the vendor's own API surface
- **Thinking**: not declared — the
  [Chat Completions reference](https://developers.telnyx.com/api-reference/openai-chat/create-a-chat-completion-openai-compatible)
  documents `reasoning_effort` and the Quickstart documents a `reasoning_content`
  response field, but this entry sets no reasoning request parameter
- **Max output tokens**: `models.defaultMaxOutputTokens` is 8192, the
  `max_tokens` default the Chat Completions reference states. The reference also
  says "Reasoning models consume this budget across reasoning and answer tokens
  combined."
- **Vision**: each model's `vision` field is `false`, a placeholder for a
  boolean the catalog schema requires; it is not a vendor statement
- **Billing**: see [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://telnyx.com/sign-up and create a Telnyx account — the Inference API Quickstart (https://developers.telnyx.com/docs/inference/getting-started) lists a "Telnyx account" and an "API Key" under Prerequisites
2. Create an API key at https://portal.telnyx.com/#/app/auth/v2, the link the Quickstart gives for the API Key
3. Authentication is HTTP Bearer: the Service tiers page (https://developers.telnyx.com/docs/inference/service-tiers) shows a curl request to https://api.telnyx.com/v2/ai/openai/models with the header Authorization: Bearer $TELNYX_API_KEY
4. Billing as the vendor states it: see [Billing](#billing) below
5. Set `TELNYX_API_KEY` in your .env file (the docs' examples read `TELNYX_API_KEY`)

### 2. Configure

```bash
export TELNYX_API_KEY=your-api-key
export TELNYX_MODEL=zai-org/GLM-5.3-Flash   # optional — overrides the default model
export TELNYX_BASE_URL=https://api.telnyx.com/v2/ai/openai   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "telnyx",
  model: "zai-org/GLM-5.3-Flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider telnyx
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "telnyx",
  credentials: { telnyx: { apiKey: process.env.TELNYX_API_KEY } },
});
```

---

## Billing

`billingPolicy` in the catalog file is recorded as unknown in the growth queue;
the catalog schema has no unknown value, so the file holds `no-free-tier` as a
placeholder. It is not a vendor statement of signup terms.

What the vendor's pages say:

- The [Inference pricing page](https://telnyx.com/pricing/inference-api) shows
  a plan named PAY AS YOU GO described as "Standard rates. Card on file.
  Automatic tier discounts as usage crosses thresholds, no contract needed."
- The [docs pricing page](https://developers.telnyx.com/docs/inference/models/pricing)
  says "Pay-per-token. No minimums, no commitments." and points to
  telnyx.com/pricing/inference-api for current per-model pricing.

---

## Models

| Model                                | Context | Vision            | $/M in · out (cached)            | Notes                                                                                                                                    |
| ------------------------------------ | ------- | ----------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `zai-org/GLM-5.3-Flash` ⭐           | 1M      | false placeholder | $0.135 / $0.450 (cached $0.027)  | NeuroLink default. Best For "Efficient multimodal coding and agentic workflows", tagged "(Recommended)"; the Quickstart's example model. |
| `zai-org/GLM-5.3`                    | 1M      | false placeholder | $1.250 / $4.000 (cached $0.240)  | Fallback. Best For "Complex coding and long-horizon agent tasks"; pricing row "GLM-5.3 — Flagship frontier intelligence".                |
| `deepseek-ai/DeepSeek-V4.1-Flash`    | 1M      | false placeholder | $0.300 / $1.200 (cached $0.006)  | Fallback. Best For "Low-latency multimodal inference"; the Service tiers page's Flex example model.                                      |
| `moonshotai/Kimi-K3`                 | 1M      | false placeholder | $2.700 / $13.500 (cached $0.270) | Fallback. Best For "State-of-the-art open-weight intelligence for coding, reasoning, and multimodal work".                               |
| `moonshotai/Kimi-K2.6`               | 256K    | false placeholder | $0.665 / $4.000 (cached $0.080)  | Fallback. Best For "Voice AI"; Voice AI column "Verified — default".                                                                     |
| `zai-org/GLM-5.2`                    | 1M      | false placeholder | $1.000 / $4.000 (cached $0.200)  | Fallback. Best For "Coding, reasoning, 1M context window"; Voice AI column "Verified".                                                   |
| `MiniMaxAI/MiniMax-M3-MXFP8`         | 1M      | false placeholder | $0.270 / $1.100 (cached $0.080)  | Fallback. Best For "Cheapest while maintaining high intelligence".                                                                       |
| `deepseek-ai/DeepSeek-V4-Flash-0731` | 1M      | false placeholder | not set                          | Fallback. Best For "Advanced coding, tool use, and long-horizon agentic workflows".                                                      |
| `Qwen/Qwen3.8-27B`                   | 256K    | false placeholder | $0.400 / $3.000 (cached $0.050)  | Fallback. Best For "Multimodal coding and visual understanding across documents, diagrams, and video"; Voice AI column "Not supported".  |

Model ids, Context Length labels and the Best For text are read from
[the models page](https://developers.telnyx.com/docs/inference/models),
retrieved 2026-09-29. `contextWindow` is NeuroLink's decimal reading of the
label (1M is 1,000,000 and 256K is 256,000).
`models.defaultContextWindow` (128,000) is a placeholder the vendor does not
publish, for model ids outside the catalog.

Prices come from the second of the three chat-completions tables on
[the Inference pricing page](https://telnyx.com/pricing/inference-api) (the
page's selector lists Flex, Default and Priority in that order; the docs
pricing page says omitting `service_tier` uses `default`). That page names rows
by display name, and NeuroLink matched each row to a models-page id. The row
"DeepSeek V4 Flash — Ultra-fast, cost-efficient inference" is not matched to a
models-page id, so `deepseek-ai/DeepSeek-V4-Flash-0731` has no price in the catalog.

**Fallback order** when the default is unavailable follows the models page's row
order: `zai-org/GLM-5.3` → `deepseek-ai/DeepSeek-V4.1-Flash` →
`moonshotai/Kimi-K3` → `moonshotai/Kimi-K2.6` → `zai-org/GLM-5.2` →
`MiniMaxAI/MiniMax-M3-MXFP8` → `deepseek-ai/DeepSeek-V4-Flash-0731` →
`Qwen/Qwen3.8-27B`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Telnyx — **docs-verified only, not live-verified**:

| Probe                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                                | unauthenticated `GET https://api.telnyx.com/v2/ai/openai/models` answers HTTP 401 without a key, 2026-09-29; model ids come from the models page and the roster has not been checked                                                                                                                                                                                                                                                                                            |
| Auth-failure shape                    | unauthenticated `GET /models`: HTTP 401, header `www-authenticate: Bearer resource_metadata="https://api.telnyx.com/.well-known/oauth-protected-resource"`, JSON body `errors[0]` code `10009`, title "Authentication failed", detail "Could not find any usable credentials in the request." An unauthenticated `GET /chat/completions` answered HTTP 404 with code `10005`, title "Resource not found". No POST request was sent. `errorRules` holds one rule, for status 401 |
| Billing                               | public pricing pages quoted under [Billing](#billing), 2026-09-29; no signup was performed                                                                                                                                                                                                                                                                                                                                                                                      |
| Streaming / tools / structured output | documented on the Quickstart, Function Calling, Streaming and Parallel Calls and JSON Mode pages; these were not exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                                                                                      |
| Live capability sweep                 | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=telnyx` with a real key and record the result.                                                                                                                                                                                                                                                           |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                       | Cause                                                                                                                                                                                                             | Fix                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| HTTP 401, code `10009`                        | Telnyx's [error catalog](https://developers.telnyx.com/docs/overview/errors) describes 10009 "Authentication failed" as "The required authentication headers were either invalid or not included in the request." | Set `TELNYX_API_KEY`; the docs' examples read the same variable                            |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination                                                                                                                                       | NeuroLink omits `response_format` automatically whenever tools are present, before sending |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
