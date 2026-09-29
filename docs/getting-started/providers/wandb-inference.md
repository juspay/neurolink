---
title: W&B Inference Provider Guide
description: W&B Inference on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `openai/gpt-oss-120b`
keywords: wandb, wandb-inference, weights and biases, serverless inference, openai-compatible, tier 2, provider setup
---

# W&B Inference Provider Guide

W&B Inference (the vendor's docs call it Serverless Inference) is a
**Tier-2 catalog provider**: OpenAI-wire-compatible with no behavioural
quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/wandb-inference.json`) rather than hand-written
code. That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET /v1/models` needs a key (an unauthenticated
> GET answers HTTP 401), so the model ids come from the vendor's public
> [models page](https://docs.wandb.ai/inference/models) and the roster has not
> been checked. No account was created and no API key was used to build this
> entry. `evidence.liveMatrix` is `null` until someone runs the live capability
> matrix with a real key (see [Verification status](#verification-status)
> below).

---

## Key Facts

- **Provider id**: `wandb-inference` (alias `wandb`)
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the
  [chat completions reference](https://docs.wandb.ai/inference/api-reference/chat-completions)
  says the endpoint "follows the OpenAI format for sending messages and
  receiving responses"
- **Base URL**: `https://api.inference.wandb.ai/v1`
- **Default model**: `openai/gpt-oss-120b`
- **Models in catalog**: 12 (taken from the 20 rows of the models page's
  "Generally available models" table)
- **Streaming**: supported — the
  [streaming page](https://docs.wandb.ai/inference/response-settings/streaming)
  says "All hosted models support streaming output."
- **Tool calling**: `model-dependent` — the
  [tool-calling page](https://docs.wandb.ai/inference/response-settings/tool-calling)
  documents function calling ("Serverless Inference only supports calling
  functions") with an example on `openai/gpt-oss-20b`; the models page
  describes `ibm-granite/granite-4.2-8b` as "capable of enhanced tool calling"
  and `google/gemma-4-26B-A4B-it` as having "function calling for agentic
  workflows"
- **Tools while streaming**: not declared (`false`)
- **Structured output**: supported — the
  [structured-output page](https://docs.wandb.ai/inference/response-settings/structured-output)
  documents `json_schema` as the `response_format` type, and the
  [JSON-mode page](https://docs.wandb.ai/inference/response-settings/json-mode)
  documents `json_object`. The vendor's
  [422 article](https://docs.wandb.ai/support/inference/articles/api-error-code-422-invalid-request-parameters)
  says "Some parameters (such as `frequency_penalty`, `logprobs`, or
  `response_format`) are not supported by all models."
- **Structured output + tools together**: not declared (`false`) — no
  combined request was sent; the requests made were unauthenticated GETs
- **Embeddings**: not declared — the
  [API reference](https://docs.wandb.ai/inference/api-reference) lists two
  methods, Chat Completions and List Models
- **Thinking**: not declared (`false`). The vendor's
  [reasoning page](https://docs.wandb.ai/inference/response-settings/reasoning)
  says reasoning information appears in the `reasoning` field of responses and
  that `chat_template_kwargs.enable_thinking` turns it on or off for models
  that allow toggling; this entry does not set that flag
- **Billing**: `free-tier` — see [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://app.wandb.ai/login?signup=true and sign up for a W&B account ([prerequisites](https://docs.wandb.ai/inference/prerequisites))
2. Create an API key: click your user profile icon, then User Settings, then Create new API key, and copy it immediately because W&B shows the full key once ([prerequisites](https://docs.wandb.ai/inference/prerequisites)); the [API reference](https://docs.wandb.ai/inference/api-reference) also names https://wandb.ai/settings
3. Project: the [prerequisites page](https://docs.wandb.ai/inference/prerequisites) lists a W&B project among the items you must have: "Create a project in your W&B account to track usage." The [chat completions reference](https://docs.wandb.ai/inference/api-reference/chat-completions) lists "Your W&B team and project: [YOUR-TEAM]/[YOUR-PROJECT] (optional)."
4. Credits: "Serverless Inference credits come with Free, Pro, and Academic plans for a limited time." Free accounts must activate pay-as-you-go inference on the Billing tab or upgrade to a paid plan when credits run out; the default cap for a Free account is $100/month ([usage limits](https://docs.wandb.ai/inference/usage-limits))
5. Set `WANDB_INFERENCE_API_KEY` in your .env file

### 2. Configure

```bash
export WANDB_INFERENCE_API_KEY=your-api-key
export WANDB_INFERENCE_MODEL=openai/gpt-oss-120b   # optional — overrides the default model
export WANDB_INFERENCE_BASE_URL=https://api.inference.wandb.ai/v1   # optional — proxy or self-hosted gateway
```

The [chat completions reference](https://docs.wandb.ai/inference/api-reference/chat-completions)
shows an optional team and project for usage tracking
(`project="[YOUR-TEAM]/[YOUR-PROJECT]"` on the Python OpenAI client, or an
`OpenAI-Project` header). The [API reference](https://docs.wandb.ai/inference/api-reference)
says: "If you don’t specify these, W&B uses your default entity and the project
name inference." The catalog schema has no field for extra request headers, so
this entry does not send one.

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "wandb-inference",
  model: "openai/gpt-oss-120b",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider wandb-inference
```

Per-request credentials use the same shape as for the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "wandb-inference",
  credentials: {
    wandbInference: { apiKey: process.env.WANDB_INFERENCE_API_KEY },
  },
});
```

---

## Billing

The [usage limits page](https://docs.wandb.ai/inference/usage-limits) says
"Serverless Inference credits come with Free, Pro, and Academic plans for a
limited time. Enterprise availability may vary." When credits run out, Free
accounts "must activate pay-as-you-go inference on the **Billing** tab, or
upgrade to a paid plan to continue using Serverless Inference", and the page
adds "W&B requires prepayment for paid Inference access." Its account-tier
table lists a default cap of $100/month for Free, $6,000/month for Pro and
$700,000/year for Enterprise. Per-token prices are on the
[pricing page](https://wandb.ai/site/pricing/tokens/), which links from the
docs as `https://wandb.ai/site/pricing/inference`. The entry records
`free-tier`.

---

## Models

| Model                                | Context   | Vision | $/M in · out                     | Notes                                                                                                                                                                                       |
| ------------------------------------ | --------- | ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai/gpt-oss-120b` ⭐             | 131,072   | no     | $0.03 / $0.17                    | NeuroLink default. "Efficient Mixture-of-Experts model designed for high-reasoning, agentic and general-purpose use cases." Reasoning page: "Always on".                                    |
| `deepseek-ai/DeepSeek-V4-Flash-0731` | 262,144   | no     | $0.13 / $0.28 (cache hit $0.07)  | "an MoE model great for coding, reasoning, and agentic workloads."                                                                                                                          |
| `meta-llama/Llama-3.3-70B-Instruct`  | 128,000   | no     | $0.71 / $0.71                    | "Multilingual model excelling in conversational tasks, detailed instruction-following, and coding."                                                                                         |
| `openai/gpt-oss-20b`                 | 131,072   | no     | $0.03 / $0.13                    | "Lower latency Mixture-of-Experts model trained on OpenAI's Harmony response format with reasoning capabilities." Example model on the tool-calling, structured-output and JSON-mode pages. |
| `meta-llama/Llama-3.1-8B-Instruct`   | 131,072   | no     | $0.22 / $0.22                    | "Efficient conversational model optimized for responsive multilingual chatbot interactions." Model in the quick-start example on the Serverless Inference page.                             |
| `zai-org/GLM-5.2`                    | 1,048,576 | no     | $0.76 / $2.42 (cache hit $0.14)  | "a Mixture-of-Experts language model featuring 40 billion activated parameters and a total of 744 billion parameters."                                                                      |
| `deepseek-ai/DeepSeek-V4-Pro-0813`   | 1,048,576 | no     | $1.31 / $3.96 (cache hit $0.044) | "a 1.6T-parameter MoE model excelling at advanced reasoning, coding, and complex agentic workloads."                                                                                        |
| `google/gemma-4-26B-A4B-it`          | 262,144   | yes    | $0.10 / $0.30 (cache hit $0.05)  | "a multimodal MoE model with LoRA support and function calling for agentic workflows." `models.visionModel`.                                                                                |
| `Qwen/Qwen3.8-27B`                   | 262,144   | yes    | $0.40 / $3.00 (cache hit $0.15)  | "a dense multimodal model suited for coding, research, vision, and long-running agent tasks."                                                                                               |
| `moonshotai/Kimi-K2.6`               | 262,144   | yes    | $0.65 / $3.41 (cache hit $0.15)  | "a multimodal Mixture-of-Experts language model featuring 32 billion activated parameters and a total of 1 trillion parameters."                                                            |
| `deepseek-ai/DeepSeek-V4.1-Flash`    | 1,048,576 | yes    | $0.20 / $0.65 (cache hit $0.03)  | "a multimodal MoE model for coding, reasoning, and agentic workloads with long contexts."                                                                                                   |
| `ibm-granite/granite-4.2-8b`         | 131,072   | no     | $0.10 / $0.15 (cache hit $0.05)  | "an instruct model capable of enhanced tool calling, instruction following, and chat capabilities."                                                                                         |

Context comes from the `contextWindow` field of the vendor's public catalog
API, `GET https://trace.wandb.ai/inference/catalog/models` (called
unauthenticated on 2026-09-29; the vendor's
[Service API overview](https://docs.wandb.ai/weave/reference/service-api)
gives `https://trace.wandb.ai` as the base URL, and the
[endpoint page](https://docs.wandb.ai/weave/reference/service-api/inference/inference-catalog-models)
says "This API is available without authentication."). The models page shows
the same figures in rounded form, for example "262k". Prices come from the
[pricing page](https://wandb.ai/site/pricing/tokens/), shown per 1 million
tokens; its rows are named as on the models page, and a `-` in its cache hit
column means no cache-hit price is recorded here. Notes quote the
"Description" column of the
[models page](https://docs.wandb.ai/inference/models), retrieved 2026-09-29.

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(8,192) are placeholders: the vendor does not publish a general default or a
maximum output figure, and no per-model `maxOutputTokens` is set.

**Fallback order** when the default is unavailable:
`deepseek-ai/DeepSeek-V4-Flash-0731` → `meta-llama/Llama-3.3-70B-Instruct` → `openai/gpt-oss-20b` → `meta-llama/Llama-3.1-8B-Instruct` → `zai-org/GLM-5.2` → `deepseek-ai/DeepSeek-V4-Pro-0813` → `google/gemma-4-26B-A4B-it` → `Qwen/Qwen3.8-27B` → `moonshotai/Kimi-K2.6` → `deepseek-ai/DeepSeek-V4.1-Flash` → `ibm-granite/granite-4.2-8b`.

**Vision:** `vision: true` marks the rows whose "Type" column on the models page
reads "Text, Vision"; rows that read "Text" are `vision: false`. No image
request was sent to confirm either.

**Lifecycle:** the [lifecycle page](https://docs.wandb.ai/inference/lifecycle)
defines "Generally available" as "The model is fully supported and recommended
for use." and says requests to retired models "fail and return an `HTTP 404`
status code." The 12 models in this catalog are rows of the models page's
"Generally available models" table.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for W&B Inference — **docs-verified only, not
live-verified**:

| Probe                      | Result                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                     | unauthenticated `GET https://api.inference.wandb.ai/v1/models` answered HTTP 401 on 2026-09-29, so the roster has not been checked; model ids are taken from the [models page](https://docs.wandb.ai/inference/models) (retrieved 2026-09-29)                                                                                                                                                                      |
| Public catalog cross-check | unauthenticated `GET https://trace.wandb.ai/inference/catalog/models` answered HTTP 200 with 47 models on 2026-09-29; the 12 catalog ids appear with `lifecycleStage` `general-availability`, and their `contextWindow` and price fields agree with the pricing page                                                                                                                                               |
| Billing                    | the usage limits page states credits "come with Free, Pro, and Academic plans for a limited time", 2026-09-29                                                                                                                                                                                                                                                                                                      |
| Auth-failure shape         | unauthenticated `GET /v1/models` and unauthenticated `GET /v1/chat/completions` both answered HTTP 401 with `{"error":{"code":"invalid_api_key","message":"Missing bearer authentication in header","type":"invalid_request_error"}}` on 2026-09-29. The `errorRules` for 402, 403, 404 and 429 follow the vendor's [support articles](https://docs.wandb.ai/support/inference); those responses were not observed |
| Tools / structured output  | documented on the tool-calling, structured-output and JSON-mode pages; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                                                       |
| Live capability sweep      | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=wandb-inference` with a real key and record the result.                                                                                                                                                                                     |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row restates a vendor
[support article](https://docs.wandb.ai/support/inference).

| Symptom                                                               | Cause (vendor)                                                                                                                                                                                                        | Fix (vendor)                                                                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| HTTP 401 "Authentication failed"                                      | An API key that is "invalid, expired, or revoked", or an incorrect W&B project entity name or project name ([401 article](https://docs.wandb.ai/support/inference/articles/api-error-code-401-authentication-failed)) | Regenerate the key from your W&B settings; check the project entity and name                              |
| HTTP 402 "You exceeded your current quota"                            | No remaining credits, or the monthly spending cap was reached ([402 article](https://docs.wandb.ai/support/inference/articles/api-error-code-402-you-exceeded-your-cur))                                              | Check plan and billing details, get more credits, or increase limits                                      |
| HTTP 403 "Country, region, or territory not supported"                | Access from an unsupported location, determined from the IP address of the request ([403 article](https://docs.wandb.ai/support/inference/articles/api-error-code-403-country-region-or-ter))                         | Check the [geographic restrictions](https://docs.wandb.ai/inference/usage-limits#geographic-restrictions) |
| HTTP 403 "The inference gateway is not enabled for your organization" | The organization has not enabled the inference gateway ([403 article](https://docs.wandb.ai/support/inference/articles/api-error-code-403-the-inference-gateway))                                                     | Ask your organization's W&B administrator to enable it                                                    |
| HTTP 404                                                              | A model id that does not match an available model, or a model that was deprecated or removed ([404 article](https://docs.wandb.ai/support/inference/articles/api-error-code-404-model-not-found))                     | Verify the id against the [models page](https://docs.wandb.ai/inference/models); ids are case-sensitive   |
| HTTP 400 or 422                                                       | A parameter the model does not support, an out-of-range value, or a malformed `messages` payload ([422 article](https://docs.wandb.ai/support/inference/articles/api-error-code-422-invalid-request-parameters))      | Read the response body before changing the request                                                        |
| HTTP 429 "Concurrency limit reached for requests"                     | Too many concurrent requests ([429 article](https://docs.wandb.ai/support/inference/articles/api-error-code-429-concurrency-limit-rea))                                                                               | Reduce concurrent requests; use exponential backoff when retrying                                         |
| HTTP 503 "The engine is currently overloaded"                         | High traffic ([503 article](https://docs.wandb.ai/support/inference/articles/api-error-code-503-the-engine-is-current))                                                                                               | Retry after a short delay with exponential backoff                                                        |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
