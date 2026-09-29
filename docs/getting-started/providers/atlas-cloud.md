---
title: Atlas Cloud Provider Guide
description: Atlas Cloud on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek-ai/deepseek-v3.2`
keywords: atlas cloud, atlascloud, openai-compatible, tier 2, provider setup, deepseek, glm, qwen, kimi
---

# Atlas Cloud Provider Guide

Atlas Cloud is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/atlas-cloud.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** Every field below comes from Atlas Cloud's own public
> documentation and an unauthenticated `GET /v1/models` call — no account was
> created and no API key was used to build it. `evidence.liveMatrix` is `null`
> until someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `atlas-cloud`
- **Protocol**: OpenAI-compatible (`POST /v1/chat/completions`, Bearer auth) —
  Atlas Cloud's LLM API Protocols page
  ([docs/llm-protocols](https://www.atlascloud.ai/docs/llm-protocols)) also
  lists Anthropic Messages, Responses and Gemini formats on the same base URL;
  NeuroLink uses only the chat-completions one
- **Base URL**: `https://api.atlascloud.ai/v1` (the `/v1` suffix is required —
  [docs/models/llm](https://www.atlascloud.ai/docs/models/llm))
- **Default model**: `deepseek-ai/deepseek-v3.2` — Atlas Cloud is an
  aggregator with no single house model; this is the model its own
  chat-completions, Anthropic-Messages and Responses examples all use
- **Models in catalog**: 10 (curated from a 120-model live roster)
- **Streaming**: supported — the LLM / Chat page states the API "supports both
  streaming and non-streaming modes"
- **Tool calling**: `model-dependent` — the docs say `tools`, `tool_choice` and
  `parallel_tool_calls` are passed through on models that advertise `tools`
- **Structured output**: supported — `response_format` accepts `json_object`
  and `json_schema` on models that advertise `json_mode` or
  `structured_outputs`; every model in this catalog advertises one of them
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Tool calls under streaming**: not declared (`false`) — no page describes
  streamed tool-call deltas
- **Thinking**: declared (`true`) — the default model carries the roster's
  `reasoning` feature and the protocols page documents normalised reasoning
  flags (`enable_thinking`, `thinking.type`, `reasoning_effort: "none"`); not
  exercised live
- **Embeddings**: `false` — the protocols page lists `/v1/embeddings` under
  "Not available"
- **Billing**: `no-free-tier` is the conservative schema value, **not a
  verified fact** — see [Billing](#billing) below
- **Key format**: starts with `apikey-` (docs/llm-protocols)

---

## Quick Start

### 1. Get an API key

1. Visit: https://www.atlascloud.ai/login and sign up or sign in (Google, GitHub, or email and password — one page handles both, see https://www.atlascloud.ai/docs/account/sign-in)
2. Open https://www.atlascloud.ai/console/api-keys, choose Create API Key and copy it immediately — it is shown only once (https://www.atlascloud.ai/docs/api-keys), and Atlas Cloud API keys begin with apikey- (https://www.atlascloud.ai/docs/llm-protocols)
3. Billing is pay-as-you-go from a prepaid balance: the quick start's Step 3 is Add Funds with a $25 minimum top-up (https://www.atlascloud.ai/docs/get-started), and requests are rejected with 402 while the balance is insufficient (https://www.atlascloud.ai/docs/errors). The homepage FAQ also says 'No credit card required to start', but no free-tier terms are documented, so check your balance at https://www.atlascloud.ai/console/billing before relying on it
4. Set `ATLAS_CLOUD_API_KEY` in your .env file (`ATLASCLOUD_API_KEY`, the name used in Atlas Cloud's own docs, is also read)

### 2. Configure

```bash
export ATLAS_CLOUD_API_KEY=apikey-your-key
export ATLAS_CLOUD_MODEL=deepseek-ai/deepseek-v3.2   # optional — overrides the default model
export ATLAS_CLOUD_BASE_URL=https://api.atlascloud.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "atlas-cloud",
  model: "deepseek-ai/deepseek-v3.2",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider atlas-cloud
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "atlas-cloud",
  credentials: { atlasCloud: { apiKey: process.env.ATLAS_CLOUD_API_KEY } },
});
```

---

## Models

| Model                                | Context | Vision | $/M in · out                  | Notes                                                                                                                                                                                                                                                          |
| ------------------------------------ | ------- | ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deepseek-ai/deepseek-v3.2` ⭐       | 164K    | no     | $0.26 / $0.38 (cached $0.13)  | Default here because the chat-completions, Anthropic Messages and Responses examples on the LLM API Protocols page use it (the vendor does not recommend it); roster tags `tools`, `structured_outputs`, `reasoning`; model page says 128K context, see below. |
| `deepseek-ai/deepseek-v4-flash`      | 1M      | no     | $0.14 / $0.28 (cached $0.028) | First fallback; 393K output ceiling on the roster.                                                                                                                                                                                                             |
| `zai-org/glm-5.3`                    | 1M      | no     | $1.40 / $4.40 (cached $0.26)  | Fallback from a second family (GLM is a featured family on the LLM / Chat page); 131K output ceiling.                                                                                                                                                          |
| `Qwen/Qwen3-235B-A22B-Instruct-2507` | 131K    | no     | $0.20 / $0.88 (cached $0.20)  | Fallback from a third family (Qwen is featured on the LLM / Chat page).                                                                                                                                                                                        |
| `deepseek-ai/deepseek-v4-pro`        | 1M      | no     | $1.68 / $3.38 (cached $0.13)  | Roster output ceiling 393K.                                                                                                                                                                                                                                    |
| `zai-org/glm-5.1`                    | 203K    | no     | $1.26 / $3.96 (cached $0.234) | Roster output ceiling equals context (203K), so none recorded separately.                                                                                                                                                                                      |
| `minimaxai/minimax-m2.7`             | 197K    | no     | $0.30 / $1.20 (cached $0.06)  | MiniMax is a featured family on the LLM / Chat page.                                                                                                                                                                                                           |
| `moonshotai/kimi-k2.6`               | 262K    | yes    | $0.95 / $4.00 (cached $0.16)  | Roster input modalities text, image, video; `models.visionModel`.                                                                                                                                                                                              |
| `qwen/qwen3.5-397b-a17b`             | 262K    | yes    | $0.55 / $3.50 (cached $0.55)  | Roster input modalities text, image, video; 65K output ceiling.                                                                                                                                                                                                |
| `qwen/qwen3.5-27b`                   | 262K    | yes    | $0.27 / $2.16 (cached $0.27)  | Roster input modalities text, image, video; 65K output ceiling.                                                                                                                                                                                                |

Context, pricing, output ceilings and modalities are taken from an
unauthenticated `GET https://api.atlascloud.ai/v1/models` call made
2026-09-29 (120 models total; 10 curated into this catalog, all of them
text-output models whose roster entry advertises `tools` plus
`json_mode` or `structured_outputs`). The roster reports prices per token;
the table multiplies by one million. Where a model's `max_output_length`
equals its context window, no separate output ceiling is recorded in the
catalog. `models.defaultContextWindow` and `models.defaultMaxOutputTokens`
(both 163,840) are the default model's own roster figures.

**Default model's context window — the vendor's pages disagree.** The model
page for `deepseek-ai/deepseek-v3.2`
([models/deepseek-ai/deepseek-v3.2](https://www.atlascloud.ai/models/deepseek-ai/deepseek-v3.2))
says "128K token context length support" and lists "Context Length: 128K
tokens" in its spec table. The roster's `context_length` and the same page's
machine-readable reference
([llms.txt](https://www.atlascloud.ai/models/deepseek-ai/deepseek-v3.2/llms.txt):
"Context length: 163,840 tokens", "Max output tokens: 163,840") both say
163,840. The catalog records 163,840 because the two API-facing sources agree
on it; the vendor does not say which figure governs. No request longer than
128K tokens was sent, so treat the range between 128K and 163,840 as
vendor-declared and untested; if you need certainty, keep prompts under 128K
tokens.

**Fallback order** when the default is unavailable:
`deepseek-ai/deepseek-v4-flash` → `zai-org/glm-5.3` →
`Qwen/Qwen3-235B-A22B-Instruct-2507`.

Vision tags (`vision: true`) come from the `image` entry in each model's
roster `input_modalities`, not from an image-input probe — no key was used to
send a real image request. Image parts use the OpenAI `image_url` content-part
shape described on the protocols page.

**About `is_ready`.** In the 2026-09-29 roster call the `is_ready` field was
`false` on 73 of the 120 entries (by id prefix: `anthropic/` 29, `openai/` 18,
`google/` 11, `qwen/` 8, `xai/` 4, `moonshotai/` 2, `zai-org/` 1) and absent on
the other 47. The models in this catalog are entries where it is absent. The
roster also comes back in a custom `{code, msg, data}` envelope rather than OpenAI's `{object: "list"}` wrapper, but `data` is still
an array of `{id, ...}` entries.

---

## Billing

The vendor's pages do not agree, and the catalog does not paper over that:

- The billing docs
  ([docs/billing](https://www.atlascloud.ai/docs/billing),
  [top-up](https://www.atlascloud.ai/docs/billing/topup),
  [balance & credits](https://www.atlascloud.ai/docs/billing/credits)) and the
  [quick start](https://www.atlascloud.ai/docs/get-started) describe
  pay-as-you-go from a prepaid balance with a $25 minimum top-up; a request
  made with an insufficient balance is rejected with HTTP 402
  ([docs/errors](https://www.atlascloud.ai/docs/errors)). Bonus credits exist
  (promotions, redeem codes, referrals) but are not described as a free tier.
- The [homepage](https://www.atlascloud.ai) FAQ says "No credit card required
  to start" in its answer to "How do I get started"; the phrase "free credits"
  appears only in the homepage blurbs for the GPT Image 2 and Nano Banana 2
  models, with no terms. The
  [pricing page](https://www.atlascloud.ai/pricing/models) is headed "Pay Per
  Use, No Subscriptions".

No page states what a brand-new, unfunded account can actually call, so
`billingPolicy` is set to `no-free-tier` because the schema has no "unknown"
value and that is the conservative choice for a setup wizard — not because it
was confirmed. Check the balance in the
[console](https://www.atlascloud.ai/console/billing) before relying on it.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Atlas Cloud — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models`, HTTP 200, 120 models, 2026-09-29 — no key used                                                                                                                                                                                              |
| Billing                   | public docs, quick start and homepage read 2026-09-29; prepaid balance and 402 on insufficient balance are documented, the homepage FAQ's "No credit card required to start" is not reconciled with them — see [Billing](#billing)                                            |
| Auth-failure shape        | documented on docs/errors (`{"code":401,"msg":"unauthorized","request_id":"…","data":null}`; a wrong path also returns 401; 402 is insufficient balance; 404 covers models not available to the account) and **not probed live** — `errorRules` is built from that page alone |
| Tools / structured output | documented on docs/llm-protocols for models that advertise them (the page does not say what happens on other models); neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                   |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=atlas-cloud` with a real key and record the result.                                                    |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                       | Cause                                                                                                                                 | Fix                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| HTTP 401 on every request                     | Key missing, unknown or expired — or a mistyped endpoint path (the gateway authenticates first)                                       | Check `ATLAS_CLOUD_API_KEY`, and confirm the base URL ends in `/v1`                                                    |
| HTTP 402                                      | Insufficient balance                                                                                                                  | Add funds in the [console](https://www.atlascloud.ai/console/billing); service resumes after top-up                    |
| Model not found (404)                         | Resource not found — the docs say a 404 for a model also covers models that are not available to your account (docs/errors)           | Check the model id against the catalog; the unauthenticated `GET https://api.atlascloud.ai/v1/models` roster lists ids |
| HTTP 429 with no `Retry-After`                | Per-account, per-model rate limit; LLM endpoints send no `X-RateLimit-*` or `Retry-After` headers                                     | Back off client-side with jitter (docs/errors)                                                                         |
| 200 on a stream, but the reply is cut short   | Errors after a stream opens arrive as events inside the stream                                                                        | Handle mid-stream termination; ignore SSE comment lines starting with `:` (keep-alives)                                |
| Tool calls or `response_format` misbehave     | The docs cover them for models that advertise `tools` / `json_mode` / `structured_outputs`; behaviour on other models is undocumented | Use a model from the table above (all advertise `tools` and `json_mode` or `structured_outputs`)                       |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination                                                           | NeuroLink omits `response_format` automatically whenever tools are present, before sending                             |
| Reply contains a system prompt you never sent | The gateway inserts "You are a helpful assistant." when no system prompt is sent                                                      | Send your own system message                                                                                           |
| Embeddings call fails                         | Atlas Cloud has no `/v1/embeddings` endpoint                                                                                          | Use a different provider for embeddings                                                                                |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
