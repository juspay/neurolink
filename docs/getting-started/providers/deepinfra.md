---
title: DeepInfra Provider Guide
description: DeepInfra on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek-ai/DeepSeek-V4-Flash-0731`
keywords: deepinfra, openai-compatible, tier 2, provider setup, deepseek
---

# DeepInfra Provider Guide

DeepInfra is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/deepinfra.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** Every field below comes from DeepInfra's own public
> documentation and an unauthenticated `GET /v1/openai/models` call — no API
> key was created or used to build it. `evidence.liveMatrix` is `null` until
> someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `deepinfra`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.deepinfra.com/v1/openai`
- **Default model**: `deepseek-ai/DeepSeek-V4-Flash-0731`
- **Models in catalog**: 8 (curated from a 187-model live roster)
- **Streaming**: supported — documented as working "for all supported
  models" (docs.deepinfra.com/chat/streaming)
- **Tool calling**: `model-dependent` — DeepInfra documents an
  OpenAI-compatible tool-calling API, but the docs name only a couple of
  example models and never claim every model supports it
- **Structured output**: supported — both `json_object` and `json_schema`
  response formats are documented (docs.deepinfra.com/chat/structured-outputs)
- **Structured output + tools together**: not declared (`false`) — no
  combined probe was run without credentials
- **Embeddings**: not declared on this catalog entry. DeepInfra does document
  an OpenAI-compatible `/v1/openai/embeddings` route, but NeuroLink's generic
  `ConfiguredOpenAICompatProvider` (which every Tier-2 catalog entry uses)
  does not implement `embed()`/`embedMany()` for any provider, so this flag
  tracks that, not the vendor's own API surface
- **Billing**: `no-free-tier` — DeepInfra's pricing page states a card or
  pre-payment is required before any request succeeds
- **Key format**: none declared by DeepInfra

---

## Quick Start

### 1. Get an API key

1. Visit: https://deepinfra.com/dash/api_keys and sign in (Google, GitHub, email & password, or Corporate SSO — see https://docs.deepinfra.com/account/signing-in)
2. Create an API key and copy it when it is shown
3. No free tier: DeepInfra requires a card or pre-payment before any request succeeds (https://deepinfra.com/pricing)
4. Set `DEEPINFRA_API_KEY` in your .env file

### 2. Configure

```bash
export DEEPINFRA_API_KEY=your-api-key
export DEEPINFRA_MODEL=deepseek-ai/DeepSeek-V4-Flash-0731   # optional — overrides the default model
export DEEPINFRA_BASE_URL=https://api.deepinfra.com/v1/openai   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "deepinfra",
  model: "deepseek-ai/DeepSeek-V4-Flash-0731",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider deepinfra
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "deepinfra",
  credentials: { deepinfra: { apiKey: process.env.DEEPINFRA_API_KEY } },
});
```

---

## Models

| Model                                       | Context | Vision | $/M in · out                   | Notes                                                                                                                                        |
| ------------------------------------------- | ------- | ------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `deepseek-ai/DeepSeek-V4-Flash-0731` ⭐     | 1M      | no     | $0.06 / $0.18 (cached $0.015)  | Recommended — the exact model used in DeepInfra's own tool-calling docs example and named as reasoning_effort-capable in its reasoning docs. |
| `deepseek-ai/DeepSeek-V4-Pro-0813`          | 1M      | no     | $1.30 / $2.60 (cached $0.10)   | Larger DeepSeek variant; roster-listed only; fallback.                                                                                       |
| `openai/gpt-oss-120b`                       | 131K    | no     | $0.037 / $0.17                 | OpenAI's open-weight 120B model; reasoning-tagged on the live roster; fallback.                                                              |
| `moonshotai/Kimi-K3`                        | 1M      | yes    | $2.85 / $14.25 (cached $0.285) | Named in DeepInfra's tool-calling docs as "the current Kimi model in our catalog"; roster-tagged vision; fallback.                           |
| `zai-org/GLM-5.2`                           | 1M      | no     | $0.75 / $2.40 (cached $0.14)   | Named in DeepInfra's reasoning docs as reasoning_effort-capable; fallback.                                                                   |
| `anthropic/claude-haiku-4-5`                | 200K    | yes    | $1.00 / $5.00                  | Claude Haiku 4.5 served through DeepInfra's marketplace; roster-tagged vision + reasoning_effort; fallback.                                  |
| `Qwen/Qwen3-14B`                            | 41K     | no     | $0.12 / $0.24                  | Smaller Qwen reasoning-tagged model; roster-listed only; fallback.                                                                           |
| `meta-llama/Llama-4-Scout-17B-16E-Instruct` | 328K    | yes    | $0.10 / $0.30                  | Roster-tagged vision; fallback; `models.visionModel`.                                                                                        |

Context and pricing are taken from an unauthenticated
`GET https://api.deepinfra.com/v1/openai/models` call made 2026-09-28 (187
models total; 8 curated into this catalog). `models.defaultContextWindow`
(128,000) and `models.defaultMaxOutputTokens` (16,384) are the vendor's
documented general fallback figures — DeepInfra's own docs state the
per-response output cap is "model-dependent, with a hard cap of 16384 tokens
… for most models" (docs.deepinfra.com/chat/overview) — not per-model values,
since DeepInfra's live roster reports each model's `max_tokens` field equal
to its context length (not a distinct output ceiling).

**Fallback order** when the default is unavailable:
`deepseek-ai/DeepSeek-V4-Pro-0813` → `openai/gpt-oss-120b` →
`moonshotai/Kimi-K3` → `zai-org/GLM-5.2` → `anthropic/claude-haiku-4-5` →
`Qwen/Qwen3-14B` → `meta-llama/Llama-4-Scout-17B-16E-Instruct`.

Vision tags (`vision: true`) come from the `vlm`/`vision` tags DeepInfra's
own live roster attaches to each model, not from an independent image-input
probe — no key was used to send a real image request.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for DeepInfra — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/openai/models`, HTTP 200, 187 models, 2026-09-28 — no key used                                                                                                                                           |
| Billing                   | public pricing page confirms "You have to add a card or pre-pay or you won't be able to use our services" — no free tier, 2026-09-28                                                                                              |
| Auth-failure shape        | not documented anywhere DeepInfra publishes (docs site has no errors page; the public OpenAPI spec at `api.deepinfra.com/openapi.json` documents only 200/422 for `chat/completions`) and not probed live — `errorRules` is empty |
| Tools / structured output | documented on docs.deepinfra.com/chat/tool-calling and /chat/structured-outputs respectively; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`               |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=deepinfra` with a real key and record the result.          |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                       | Cause                                                                       | Fix                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Requests fail immediately                     | No card on file / no pre-payment balance                                    | DeepInfra requires billing setup before any request succeeds; add a card or pre-pay        |
| Model not found                               | The roster changed since 2026-09-28                                         | Pick a current id from the unauthenticated `GET /v1/openai/models` roster                  |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination | NeuroLink omits `response_format` automatically whenever tools are present, before sending |
| Tool calls not returned                       | Tool calling on DeepInfra is model-dependent                                | Use a model DeepInfra names as tool-capable (e.g. the default, or `moonshotai/Kimi-K3`)    |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
