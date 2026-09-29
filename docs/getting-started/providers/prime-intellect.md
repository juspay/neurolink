---
title: Prime Intellect Provider Guide
description: Prime Intellect on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `openai/gpt-4.1-mini`
keywords: prime-intellect, pinference, openai-compatible, tier 2, provider setup, gateway
---

# Prime Intellect Provider Guide

Prime Intellect Inference is a **Tier-2 catalog provider**: OpenAI-wire-compatible
with no behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/prime-intellect.json`) rather than hand-written
code. That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** Every field below comes from Prime Intellect's own public
> documentation, its public OpenAPI spec, and unauthenticated `GET` requests to
> `https://api.pinference.ai` — no API key was created or used to build it, and
> no `POST` was sent. `evidence.liveMatrix` is `null` until someone runs the live
> capability matrix with a real key (see [Verification status](#verification-status)
> below).

---

## Key Facts

- **Provider id**: `prime-intellect`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — Prime's inference
  overview calls it "OpenAI-compatible API access" and shows the official
  `openai` client pointed at a custom `base_url`
  (https://docs.primeintellect.ai/inference/overview)
- **Base URL**: `https://api.pinference.ai/api/v1`. The inference host
  (`pinference.ai`) is a different domain from the docs and dashboard host
  (`primeintellect.ai`); both are confirmed on the vendor's own pages
- **Default model**: `openai/gpt-4.1-mini`
- **Models in catalog**: 12 (curated from a 125-model roster read on 2026-09-29;
  the discovery queue recorded 124, so the roster moves)
- **What it is**: a gateway. 119 of the 125 roster entries are `serving:
"gateway"` (routed to upstream providers); the other 6 are `serving:
"hosted"` (served on Prime infrastructure) and are third-party Qwen and GLM
  models. No Prime-trained model appears on the roster
- **Streaming**: supported — documented on the Advanced Usage and Chat
  Completions reference pages (`stream: true`)
- **Tool calling**: `model-dependent` — the docs pages do not describe function
  calling, but the roster's own per-model `supported_parameters` field lists
  `tools` and `tool_choice` for 111 of 125 models and omits them for others
  (see [Verification status](#verification-status) for the basis)
- **Structured output**: declared `true` on the same basis — `response_format`
  is listed for 106 of 125 roster models, `structured_outputs` for 102. It is
  per-model, not universal
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Embeddings / thinking**: not declared. No inference page describes either
- **Billing**: `no-free-tier` — Prime states billing is "automatic deduction
  from your Prime Intellect account balance". No free tier or trial credit is
  documented on the pages read. The catalog schema has no "unknown" billing
  value, so `no-free-tier` here means _none documented_, not _vendor-confirmed
  none_
- **Key format**: none declared by Prime Intellect

---

## Quick Start

### 1. Get an API key

1. Visit: https://app.primeintellect.ai/dashboard/tokens (Settings -> API Keys) and sign in
2. Click Generate New Key and enable the **Inference** permission — without it requests fail with authentication errors (https://docs.primeintellect.ai/inference/overview); the key is shown only once, so copy it straight away (https://docs.primeintellect.ai/api-reference/api-keys)
3. Billing is automatic deduction from your Prime Intellect account balance (https://docs.primeintellect.ai/inference/overview); no free tier or trial credit is documented on the pages read, so add funds at https://app.primeintellect.ai/dashboard/billing and confirm current terms before the first call
4. Set `PRIME_INTELLECT_API_KEY` in your .env file (`PRIME_API_KEY`, the variable Prime's own docs use, is also read)

### 2. Configure

```bash
export PRIME_INTELLECT_API_KEY=your-api-key
export PRIME_INTELLECT_MODEL=openai/gpt-4.1-mini   # optional — overrides the default model
export PRIME_INTELLECT_BASE_URL=https://api.pinference.ai/api/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "prime-intellect",
  model: "openai/gpt-4.1-mini",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider prime-intellect
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "prime-intellect",
  credentials: {
    primeIntellect: { apiKey: process.env.PRIME_INTELLECT_API_KEY },
  },
});
```

---

## Models

| Model                                | Context   | Vision | $/M in · out                 | Notes                                                                                                                                                                |
| ------------------------------------ | --------- | ------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai/gpt-4.1-mini` ⭐             | 1,047,576 | yes    | $0.40 / $1.60                | Recommended — Prime's Evaluating Environments guide lists it as "Fast, cost-effective (default)" and uses it as the default model of its inference-backed eval flow. |
| `openai/gpt-4.1`                     | 1,047,576 | yes    | $2 / $8                      | Listed in the same guide as "Higher quality"; fallback.                                                                                                              |
| `anthropic/claude-sonnet-4.5`        | 1,000,000 | yes    | $3 / $15                     | Listed in the same guide as "Strong reasoning"; fallback.                                                                                                            |
| `meta-llama/llama-3.3-70b-instruct`  | 131,072   | no     | $1.04 / $2.253               | Listed in the same guide as "Open-weight, balanced"; fallback.                                                                                                       |
| `google/gemini-2.5-flash`            | 1,048,576 | yes    | $0.30 / $2.50                | Listed in the same guide as "Fast multimodal".                                                                                                                       |
| `Qwen/Qwen3-235B-A22B-Instruct-2507` | 262,144   | no     | $0.25 / $1                   | The guide lists a lowercase id that is not on today's roster; this id is the roster's differently cased entry.                                                       |
| `z-ai/glm-5.3`                       | 1,048,576 | no     | $1.40 / $4.40 (cached $0.26) | Served `hosted` on Prime infrastructure; reasoning is marked mandatory (default effort `max`); no `response_format` in its `supported_parameters`.                   |
| `openai/gpt-5.4-mini`                | 400,000   | yes    | $0.75 / $4.50                | Named in the Troubleshooting page's direct-API examples.                                                                                                             |
| `openai/gpt-oss-120b`                | 131,072   | no     | $0.35 / $0.75                | Roster-listed only; reasoning marked mandatory.                                                                                                                      |
| `deepseek/deepseek-v4-flash`         | 1,048,576 | no     | $0.44 / $1.32                | Roster-listed only.                                                                                                                                                  |
| `anthropic/claude-haiku-4.5`         | 200,000   | yes    | $1 / $5                      | Roster-listed only.                                                                                                                                                  |
| `Qwen/Qwen3.5-122B-A10B`             | not given | no     | $0.30 / $0.90 (cached $0.27) | Served `hosted`; the roster gives no context window or modalities, so none are declared. Vision `false` is a schema default, not a vendor statement.                 |

Context, output caps, prices and input modalities are taken from an
unauthenticated `GET https://api.pinference.ai/api/v1/models` call made
2026-09-29 (125 models total; 12 curated into this catalog). Per-model
`maxOutputTokens` in the JSON is the roster's `max_output_tokens` as served —
for example 32,768 for the default, and 235,929 for
`Qwen/Qwen3-235B-A22B-Instruct-2507`, which is reported as-is and not
independently checked. `vision: true` follows the roster's image input modality;
no image request was sent.

`models.defaultContextWindow` (131,072) and `models.defaultMaxOutputTokens`
(16,384) are **not** vendor-stated general defaults — Prime documents none. They
are the smallest context and output figures the roster reports among the curated
models, used as a conservative floor for any id without its own figure.

Prices carry an `effective_at` date on the roster and Prime's overview page says
pricing details are still to come, so treat them as a snapshot.

The models were picked for the docs that name them (the Evaluating Environments
guide and the Troubleshooting page), not ranked by quality. Prime's own docs
also show `meta-llama/llama-3.1-70b-instruct`, `deepseek/deepseek-r1-0528` and
`anthropic/claude-3-5-sonnet-20241022` in examples; none of those three ids is
on today's roster, so they are not in the catalog.

**Fallback order** when the default is unavailable: `openai/gpt-4.1` →
`anthropic/claude-sonnet-4.5` → `meta-llama/llama-3.3-70b-instruct`. The
derived single fallback is the second entry, `anthropic/claude-sonnet-4.5`,
which routes to a different upstream than the default.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Prime Intellect — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                    | unauthenticated `GET /api/v1/models`, HTTP 200, 125 models, 2026-09-29 — no key used                                                                                                                                                                                                                                                                                                       |
| Auth-failure shape        | unauthenticated `GET /api/v1/models/openai/gpt-4.1-mini` with no credentials returned HTTP 401 `{"detail":"Authorization header or x-api-key missing", ...}` on 2026-09-29. The docs' invalid-key shape (`error.code: invalid_api_key`, on the Models API reference page) was **not** probed. One `errorRules` entry maps HTTP 401 and both wordings to an authentication error            |
| Billing                   | overview page: "Automatic deduction from your Prime Intellect account balance"; troubleshooting page documents an `insufficient_funds` error. No free tier stated                                                                                                                                                                                                                          |
| Tools / structured output | **not described on any docs page read.** The declaration rests on the roster's per-model `supported_parameters` field (`tools`, `tool_choice`, `response_format`, `structured_outputs`), which is the vendor's own published metadata, not on a docs page or a live call. Neither was exercised, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false` |
| Tools + streaming         | not documented anywhere read — `toolsWithStreaming` is `false`                                                                                                                                                                                                                                                                                                                             |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=prime-intellect` with a real key and record the result.                                                                                                                                                             |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

Pages opened to build this entry (all on 2026-09-29):

- https://docs.primeintellect.ai/introduction
- https://docs.primeintellect.ai/inference/overview
- https://docs.primeintellect.ai/inference/usage
- https://docs.primeintellect.ai/inference/troubleshooting
- https://docs.primeintellect.ai/inference/team-accounts
- https://docs.primeintellect.ai/api-reference/api-keys
- https://docs.primeintellect.ai/api-reference/inference-models
- https://docs.primeintellect.ai/api-reference/inference-chat-completions
- https://docs.primeintellect.ai/tutorials-environments/evaluating
- https://docs.primeintellect.ai/hosted-training/models-and-pricing
- https://api.pinference.ai/openapi.json (public OpenAPI spec; defines the roster fields and shows the chat-completions request body accepts additional properties)
- https://api.pinference.ai/api/v1/models (unauthenticated roster)
- https://app.primeintellect.ai/dashboard/tokens and https://app.primeintellect.ai/dashboard/billing (both answer HTTP 200 and redirect to a sign-in page; nothing behind sign-in was opened)

---

## Troubleshooting

| Symptom                                       | Cause                                                                                                                                                              | Fix                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| HTTP 401 / authentication error               | Missing key, or a key created without the **Inference** permission (the overview page says this fails with auth errors)                                            | Create a new key at https://app.primeintellect.ai/dashboard/tokens with Inference enabled and set `PRIME_INTELLECT_API_KEY`    |
| `insufficient_funds` error                    | The billing account behind the key cannot pay for the call (https://docs.primeintellect.ai/inference/troubleshooting)                                              | Add funds in the Billing Dashboard, and make sure the key belongs to the account that has funds                                |
| Team credits are not used                     | Prime bills a team only when a request carries an `X-Prime-Team-ID` header, and this catalog entry sets no extra headers (the catalog schema has no field for one) | Without the header Prime bills the key owner's personal balance; fund that balance, or configure the header outside this entry |
| Model not found                               | The roster changed since 2026-09-29, or the id differs in case (the roster has both `qwen/...` and `Qwen/...` ids)                                                 | Pick a current id, copied exactly, from the unauthenticated `GET /api/v1/models` roster                                        |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination                                                                                        | NeuroLink omits `response_format` automatically whenever tools are present, before sending                                     |
| Tool calls or `response_format` rejected      | Support is per-model: e.g. `z-ai/glm-5.3` lists `tools` but not `response_format`, and `Qwen/Qwen3.5-122B-A10B` lists neither on the roster                        | Check the model's `supported_parameters` on the roster, or use a model that lists what you need (e.g. the default)             |
| A model always reasons before answering       | The roster marks reasoning as mandatory on some models (`z-ai/glm-5.3`, `openai/gpt-oss-120b`)                                                                     | Prefer the default, or a model whose roster `reasoning.mandatory` is `false`                                                   |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
