---
title: GradientAI Provider Guide
description: GradientAI (DigitalOcean) on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `llama-4-maverick`, docs-verified only
keywords: gradientai, digitalocean, inference, openai-compatible, tier 2, provider setup, llama, deepseek
---

# GradientAI Provider Guide

GradientAI (DigitalOcean) is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/gradientai.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET /v1/models` needs a key (an unauthenticated
> GET answers HTTP 401), so the model ids come from DigitalOcean's public docs and
> the roster has not been checked. No account was created and no API key was used
> to build it. `evidence.liveMatrix` is `null` until someone runs the live
> capability matrix with a real key (see
> [Verification status](#verification-status) below).

DigitalOcean's docs now brand the product "Inference"; the API reference
describes the serverless API as part of "DigitalOcean Gradient™ AI Agentic
Cloud".

---

## Key Facts

- **Provider id**: `gradientai`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://inference.do-ai.run/v1`
- **Default model**: `llama-4-maverick`
- **Models in catalog**: 12, copied from the
  [models page](https://docs.digitalocean.com/products/inference/details/models/)
  (retrieved 2026-09-29), which states "DigitalOcean Inference supports more than
  70 foundation, embeddings, and reranking models"
- **Streaming**: supported — the
  [Serverless Inference API reference](https://docs.digitalocean.com/reference/api/reference/serverless-inference/)
  documents `stream`: "If set to true, the model response data will be streamed
  to the client as it is generated using server-sent events."
- **Tool calling**: `model-dependent` — the API reference documents `tools` and
  `tool_choice` request parameters for chat completions, and the models page
  carries a "Tool calling" usage note on individual models (for example
  `glm-5.2`, `glm-5.3-flash` and `mimo-v2.5-pro` in this catalog)
- **Tools while streaming**: not declared (`false`) — the API reference
  documents `stream` and `tools` as separate request parameters
- **Structured output**: not declared (`false`) — the models page carries a
  "Structured outputs" usage note on the `glm-5.2`, `glm-5.3-flash` and
  `mimo-v2.5-pro` rows
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Embeddings**: not declared (`false`) — the
  [endpoint list](https://docs.digitalocean.com/products/inference/how-to/si-endpoints/)
  documents POST `/v1/embeddings`; the flag records that NeuroLink's generic
  catalog provider class does not implement `embed()` / `embedMany()`, not what
  the vendor's API offers
- **Thinking**: not declared (`false`) — the
  [Use Reasoning page](https://docs.digitalocean.com/products/inference/how-to/use-reasoning/)
  describes a `reasoning_effort` request parameter for models that support
  reasoning, and the flag here is provider-wide
- **Billing**: `no-free-tier` — the schema's closest member to the vendor's
  statement "You must maintain a positive prepaid account balance to send
  serverless inference requests" (pricing page)
- **Key format**: none declared (`apiKeyFormat: null`)

---

## Quick Start

### 1. Get an API key

1. Visit: https://cloud.digitalocean.com/model-studio/manage-keys (the Control Panel page that https://docs.digitalocean.com/products/inference/how-to/manage-model-access-keys/ names for creating and managing model access keys; it shows the DigitalOcean login when signed out) and sign in to a DigitalOcean account
2. Click Create model access key, enter a name, and copy the secret key when it is shown: the docs state "Copy and store it securely before closing the window."
3. Prepaid balance: the docs state "Serverless Inference requires a positive prepaid account balance before you can send inference requests." (https://docs.digitalocean.com/products/inference/how-to/manage-serverless-inference-prepayment/)
4. Set `GRADIENTAI_API_KEY` in your .env file

### 2. Configure

```bash
export GRADIENTAI_API_KEY=your-model-access-key
export GRADIENTAI_MODEL=llama-4-maverick   # optional — overrides the default model
export GRADIENTAI_BASE_URL=https://inference.do-ai.run/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "gradientai",
  model: "llama-4-maverick",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider gradientai
```

Per-request credentials use the standard NeuroLink pattern:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "gradientai",
  credentials: { gradientai: { apiKey: process.env.GRADIENTAI_API_KEY } },
});
```

---

## Models

| Model                    | Context   | Max output    | Vision | $/M in · out (cache read) | Notes                                                                                                                                                                 |
| ------------------------ | --------- | ------------- | ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llama-4-maverick` ⭐    | 128,000   | 16,384        | —      | $0.25 / $0.87             | NeuroLink default. Models page row "Llama 4 Maverick 17B 128E Instruct"; the Chat Completions page uses `model="llama-4-maverick"` in its Python OpenAI SDK example.  |
| `deepseek-v4.1-flash`    | 1,048,576 | 1,048,576     | yes    | $0.30 / $1.20 ($0.006)    | NeuroLink fallback and `models.visionModel`. Usage notes "Prompt caching", "Native vision (text and images)".                                                         |
| `deepseek-v4-pro-0813`   | 1,048,576 | 1,048,576     | —      | $1.32 / $3.96 ($0.044)    | Usage notes "Input context window of up to 1M tokens", "Prompt caching".                                                                                              |
| `deepseek-v4-flash-0731` | 1,048,576 | 1,048,576     | —      | $0.14 / $0.28 ($0.028)    | NeuroLink fallback. Usage notes "Input context window of up to 1M tokens", "Prompt caching".                                                                          |
| `deepseek-3.2`           | 163,840   | 163,840       | —      | $0.50 / $1.60 ($0.15)     | Models page row "DeepSeek V3.2". Usage note "Prompt caching".                                                                                                         |
| `glm-5.2`                | 262,144   | 262,144       | —      | $1.40 / $4.40 ($0.21)     | NeuroLink fallback. Usage notes "Text only", "Tool calling", "Structured outputs", "Reasoning".                                                                       |
| `kimi-k2.6`              | 262,144   | 262,144       | yes    | $0.95 / $4.00 ($0.19)     | NeuroLink fallback. Models by Provider table: "both with prompt caching and multimodal vision support"; Features page lists it with "Text and image inputs".          |
| `kimi-k3`                | 1,048,576 | Not published | yes    | $3.00 / $15.00 ($0.30)    | Usage notes "Chat Completions API for sending prompts for serverless inference", "Native vision (text, images)"; Features page lists it with "Text and image inputs". |
| `glm-5.3-flash`          | 1,048,576 | 1,048,576     | yes    | $0.15 / $0.50 ($0.03)     | Usage notes "Multimodal: text, image, and video inputs", "Tool calling", "Structured outputs", "Reasoning".                                                           |
| `mimo-v2.5-pro`          | 262,144   | 262,144       | —      | $0.80 / $3.00 ($0.16)     | Models page row "MiMo V2.5 Pro". Usage notes "Text only", "Tool calling", "Structured outputs", "Reasoning".                                                          |
| `nemotron-3-ultra-550b`  | 131,072   | 131,072       | —      | $0.90 / $1.70             | Models page row "Nemotron 3 Ultra". Usage note "Evaluations judge model".                                                                                             |
| `gemma-4-31B-it`         | 256,000   | 8,192         | —      | $0.18 / $0.50 ($0.036)    | NeuroLink fallback. Row "Gemma 4" on the models and pricing pages. Usage note "Prompt caching".                                                                       |

Context window, max output tokens and usage notes are from the
[models page](https://docs.digitalocean.com/products/inference/details/models/);
prices are from the
[pricing page](https://docs.digitalocean.com/products/inference/details/pricing/)
(USD per 1M tokens, Standard processing mode). Both were retrieved 2026-09-29.
The ids have not been compared with a live `GET /v1/models` roster. On the
models page the `glm-5.2` and `mimo-v2.5-pro` rows show context window 262,144
in the table and the usage note "Input context window of up to 1M tokens"; the
entry records the table figure.

`models.defaultContextWindow` (32,768) and `models.defaultMaxOutputTokens`
(4,096) are placeholders the vendor does not publish.

**Vision:** `vision: true` is set on the four rows above marked "yes", where the
models page, the Features page or both state image input for that model. The
entry sets `vision: false` on the other rows.

**Fallback order** when the default is unavailable:
`deepseek-v4.1-flash` → `deepseek-v4-flash-0731` → `glm-5.2` → `kimi-k2.6` →
`gemma-4-31B-it`. The runtime fallback model name the loader derives
(`fallbacks[1]`) is `deepseek-v4-flash-0731`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for GradientAI — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://inference.do-ai.run/v1/models` answered HTTP 401 on 2026-09-29 without a key, so model ids are taken from the models page (retrieved 2026-09-29); roster not verified                                                                                              |
| Auth-failure shape        | the 401 body was `{"id": "Unauthorized", "message": "Unable to authenticate you" }`; `authProbe` records status 401, code `Unauthorized`; `errorRules` covers 401, 429 (body documented in the API reference) and the 404 "Model not found" response described on the Model Support Policy page |
| Chat route                | unauthenticated `GET https://inference.do-ai.run/v1/chat/completions` answered HTTP 405 with an empty body on 2026-09-29; the documented verb is POST and no POST was sent                                                                                                                      |
| Billing                   | prepayment page: "Serverless Inference requires a positive prepaid account balance before you can send inference requests." — 2026-09-29                                                                                                                                                        |
| Tools / structured output | `tools` and `tool_choice` are in the API reference; "Tool calling" and "Structured outputs" appear as per-model usage notes on the models page; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                           |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=gradientai` with a real key and record the result.                                                                       |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row restates what a DigitalOcean page says; the source page is named in the
Symptom column.

| Symptom                                                                                                                               | Cause                                                                                                                        | Fix                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 401 `Unable to authenticate you` ([API reference](https://docs.digitalocean.com/reference/api/reference/serverless-inference/))  | The API reference describes 401 as "Authentication failed due to invalid credentials."                                       | Authenticate with a model access key or a DigitalOcean personal access token ([overview](https://docs.digitalocean.com/products/inference/how-to/si-overview/)) |
| Key stops working ([model access keys page](https://docs.digitalocean.com/products/inference/how-to/manage-model-access-keys/))       | "Regeneration takes effect immediately, with no grace period during which both the old and new keys are valid."              | "update any application that uses the key as soon as you regenerate it"                                                                                         |
| Access suspended ([prepayment page](https://docs.digitalocean.com/products/inference/how-to/manage-serverless-inference-prepayment/)) | "When your balance reaches $0, DigitalOcean suspends your access to Serverless Inference until you replenish it."            | "add a prepayment balance manually or enable auto-reload"                                                                                                       |
| HTTP 404 `Model not found` ([Model Support Policy](https://docs.digitalocean.com/products/inference/details/model-support-policy/))   | "The model is no longer accessible. Requests to these model IDs return a 404 Model not found error." (for deprecated models) | "Update the model ID parameter in your code to the new model ID"                                                                                                |
| HTTP 429 ([API reference](https://docs.digitalocean.com/reference/api/reference/serverless-inference/))                               | The API reference describes 429 as "The API rate limit has been exceeded."                                                   | —                                                                                                                                                               |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [Providers index](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
- DigitalOcean pages opened for this entry: [Use Serverless Inference](https://docs.digitalocean.com/products/inference/how-to/use-serverless-inference/), [Serverless Inference API Endpoints](https://docs.digitalocean.com/products/inference/how-to/si-endpoints/), [Chat Completions API](https://docs.digitalocean.com/products/inference/how-to/use-chat-completions-api/), [Available models](https://docs.digitalocean.com/products/inference/details/models/), [Pricing](https://docs.digitalocean.com/products/inference/details/pricing/), [Features](https://docs.digitalocean.com/products/inference/details/features/)
