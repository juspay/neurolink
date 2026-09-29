---
title: Aion Labs Provider Guide
description: Aion Labs on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `aion-labs/aion-3.5`
keywords: aionlabs, aion labs, openai-compatible, tier 2, provider setup, roleplay
---

# Aion Labs Provider Guide

Aion Labs is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/aionlabs.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** Every field below comes from Aion Labs' own public
> documentation and an unauthenticated `GET /v1/models` call — no account was
> created and no API key was used to build it. `evidence.liveMatrix` is `null`
> until someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `aionlabs`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the docs say the
  API is "Drop-in compatible with OpenAI's Chat API"
  (https://www.aionlabs.ai/docs/)
- **Base URL**: `https://api.aionlabs.ai/v1`
- **Default model**: `aion-labs/aion-3.5`
- **Models in catalog**: 6 (the whole roster — the live `GET /v1/models` call
  returned exactly 6, all `text->text`)
- **Model focus**: the docs models page (https://www.aionlabs.ai/docs/models/)
  describes Aion 2.0 and Aion-RP as "optimized for immersive roleplaying and
  storytelling", and the other four (Aion 3.0, 3.0 Mini, 3.5, 3.5 Mini) as
  giving stronger narrative structure, more compelling tension and conflict,
  and a nuanced treatment of mature and darker themes. The homepage
  (https://www.aionlabs.ai/) describes the API as for creative writing,
  roleplay, research and production workloads. None is described as
  vision-capable.
- **Streaming**: supported — the API reference documents `stream: true` with
  `text/event-stream` deltas ending in `data: [DONE]`
- **Tool calling**: `model-dependent` — the API reference documents `tools`
  "in OpenAI format", `tool_calls` and `role: tool` messages, but has no
  per-model support table, so nothing says every model handles them
- **Structured output**: not declared (`false`) — the request-body table in
  the API reference lists no `response_format` parameter. `generate({ schema })`
  still returns parsed `structuredData` through NeuroLink's client-side JSON
  coercion.
- **Structured output + tools together**: not declared (`false`) — no
  combined probe was possible without credentials
- **Tools + streaming**: `false` — not live-verified. The API reference
  (https://www.aionlabs.ai/docs/api-reference/) describes
  `POST /v1/chat/completions` as "OpenAI-compatible chat completions. Supports
  streaming and tool calls."
- **Thinking**: not declared (`false`) — five of the six models reason and
  the API accepts a `reasoning_effort` parameter, but the generic catalog
  provider does not send it, so NeuroLink's `thinkingLevel` is not mapped
  onto it (see [Reasoning models](#reasoning-models))
- **Embeddings**: not declared — the docs list only chat completions,
  `/v1/responses` and model discovery
- **Billing**: `free-tier` — the public pricing page offers a Free Tier with
  "A daily credit allowance … No card required."
- **Key format**: none declared by Aion Labs

---

## Quick Start

### 1. Get an API key

1. Visit: https://www.aionlabs.ai/accounts/signup/ and sign up (GitHub, Google or email)
2. Create an API key from the dashboard's API keys page (https://www.aionlabs.ai/app/api-keys/, sign-in required) and copy it when it is shown
3. Free tier: the pricing page (https://www.aionlabs.ai/pricing/) offers a daily credit allowance with no card required; free-tier limits are 15 requests/min, 20,000 tokens/min and 20,000 tokens/day (https://www.aionlabs.ai/docs/rate-limits/)
4. Set `AIONLABS_API_KEY` in your .env file

Whether a brand-new free account can create a key immediately, or waits on
manual approval (the site header also carries a "Request Access" button), was
not tested — no signup was performed to build this entry.

### 2. Configure

```bash
export AIONLABS_API_KEY=your-api-key
export AIONLABS_MODEL=aion-labs/aion-3.5   # optional — overrides the default model
export AIONLABS_BASE_URL=https://api.aionlabs.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Write the opening paragraph of a lighthouse mystery." },
  provider: "aionlabs",
  model: "aion-labs/aion-3.5",
  maxTokens: 4096,
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider aionlabs --max-tokens 4096
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "aionlabs",
  credentials: { aionlabs: { apiKey: process.env.AIONLABS_API_KEY } },
});
```

---

## Models

| Model                            | Context | Vision | $/M in · out                 | Notes                                                                                                                                                                                          |
| -------------------------------- | ------- | ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aion-labs/aion-3.5` ⭐          | 262,144 | no     | $3.00 / $6.00 (cached $0.75) | Recommended — the model every request example on Aion Labs' quickstart uses; released 2026-09-23, the latest release date on the roster (shared with 3.5 Mini); GLM-family multi-model system. |
| `aion-labs/aion-3.5-mini`        | 262,144 | no     | $0.70 / $1.40 (cached $0.18) | Released 2026-09-23; GLM-family multi-model system; roster-listed only; fallback.                                                                                                              |
| `aion-labs/aion-3.0`             | 131,072 | no     | $3.00 / $6.00 (cached $0.75) | Released 2026-05-05; GLM-family multi-model system; roster-listed only.                                                                                                                        |
| `aion-labs/aion-3.0-mini`        | 131,072 | no     | $0.70 / $1.40 (cached $0.18) | Released 2026-05-14; DeepSeek-family multi-model system; roster-listed only; fallback.                                                                                                         |
| `aion-labs/aion-2.0`             | 131,072 | no     | $0.80 / $1.60 (cached $0.20) | Variant of DeepSeek V3.2 for roleplay and storytelling (2025-12-21); roster-listed only; fallback.                                                                                             |
| `aion-labs/aion-rp-llama-3.1-8b` | 32,768  | no     | $0.80 / $1.60                | Aion-RP 1.0 (8B), a Llama 3.1 8B variant (2024-11-30); the only non-reasoning model on the roster; roster-listed only.                                                                         |

Every model has a maximum completion of 32,768 tokens. Context comes from the
`context_length` field of an unauthenticated
`GET https://api.aionlabs.ai/v1/models` call made 2026-09-29 (6 models; the
docs models page at https://www.aionlabs.ai/docs/models/ rounds the same
values to 128K / 256K / 32K). Prices are the per-million-token figures on that
docs models page, retrieved the same day; the roster's per-token `pricing`
fields agree with them. `models.defaultContextWindow` (262,144) and
`models.defaultMaxOutputTokens` (32,768) are the default model's own figures.
The docs pricing page (https://www.aionlabs.ai/docs/pricing/) served the same
table as the models page when it was fetched.

**Fallback order** when the default is unavailable:
`aion-labs/aion-3.5-mini` → `aion-labs/aion-3.0-mini` → `aion-labs/aion-2.0`.

`vision` is `false` on every model because the roster reports `text->text`
modality for all six; no image-input request was sent.

---

## Reasoning models

The five `aion-3.x` and `aion-2.0` models are tagged "Reasoning" on the docs
models page and `reasoning: true` on the roster; `aion-rp-llama-3.1-8b` is not.
The API reference (https://www.aionlabs.ai/docs/api-reference/) documents two
behaviours that matter when you call them through NeuroLink:

- **Reasoning shares the `max_tokens` budget.** Reasoning is generated first,
  so a cap exhausted during reasoning returns `finish_reason=length` with
  empty `content`. Give these models a generous `maxTokens`; it is a ceiling,
  not a reservation, and unused budget is not billed.
- **`reasoning_effort` differs by generation.** `aion-3.5` and `aion-3.5-mini`
  accept exactly `low`, `high` (default) or `max` and cannot have reasoning
  disabled — any other value returns a 400. `aion-2.0`, `aion-3.0` and
  `aion-3.0-mini` also accept `none` and `medium` (default `medium`).

NeuroLink's catalog provider does not send `reasoning_effort`, so the vendor
defaults apply.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Aion Labs — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models`, HTTP 200, 6 models, 2026-09-29 — no key used                                                                                                                                                                                   |
| Billing                   | public pricing page states a Free Tier ("A daily credit allowance … No card required."); the rate-limits page lists Free as the default tier on signup, 2026-09-29. No signup was performed, so key issuance for a fresh account is unconfirmed                  |
| Auth-failure shape        | not documented — the API reference's error table lists only 400 `invalid_request_error`, 429 `rate_limit_error` and 502 `server_error`, and no credentialed request was made. The only `errorRules` entry is the documented 429; 401s use the default classifier |
| Tools / structured output | tools are documented on the API reference but not per model and were not exercised live; no `response_format` parameter is documented, so `structuredOutput` is `false`; no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`   |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=aionlabs` with a real key and record the result.                                          |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                       | Cause                                                                                                                            | Fix                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Empty `content` with `finish_reason=length`   | The `max_tokens` cap was used up by reasoning before any visible answer                                                          | Raise `maxTokens`; on the 3.5 models reasoning cannot be turned off                                  |
| HTTP 429 `rate_limit_error`                   | Usage limit exceeded — free tier is 15 requests/min, 20,000 tokens/min and 20,000 tokens/day                                     | Wait, or top up credits to reach a higher tier (https://www.aionlabs.ai/docs/rate-limits/)           |
| HTTP 524 on a long request                    | Non-streaming responses must complete within 125 seconds; generation still finishes and is billed                                | Use streaming for large `maxTokens`, reasoning models and very long prompts                          |
| HTTP 400 `invalid_request_error`              | Unknown model or malformed request; an unsupported `reasoning_effort` value also returns 400                                     | Pick a current id from the unauthenticated `GET /v1/models` roster                                   |
| HTTP 502 `server_error`                       | Temporary server-side error                                                                                                      | Retry the request                                                                                    |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination                                                      | NeuroLink omits `response_format` automatically whenever tools are present, before sending           |
| Tool calls not returned                       | The API reference says the endpoint "Supports streaming and tool calls" but gives no per-model tool support, and none was tested | Unverified per model — check the request against the OpenAI tools format the API reference describes |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
