---
title: Vultr Inference Provider Guide
description: Vultr Inference on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `glm-5.2`
keywords: vultr, vultr-inference, openai-compatible, tier 2, provider setup, glm, deepseek, qwen
---

# Vultr Inference Provider Guide

Vultr Inference is a **Tier-2 catalog provider**: it is served by NeuroLink's
OpenAI-compatible chat-completions path, so its entire integration is one JSON
file (`src/lib/providers/catalog/vultr-inference.json`) rather than
hand-written code. That file is the source of truth for everything on this
page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** The model data, endpoint and error statuses below come from
> Vultr's public pages and unauthenticated GET requests, and no account was
> created and no API key was used to build it. `billingPolicy`, each model's
> `status` and the two `models.default*` values are required by the schema and
> are not Vultr statements. `evidence.liveMatrix` is `null` until someone runs
> the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `vultr-inference`
- **Protocol**: `/chat/completions` with bearer-token authentication. The API
  reference at https://api.vultrinference.com/ says "Responses follow
  OpenRouter's chat completion shape whichever engine serves the model", and
  the FAQ at
  https://docs.vultr.com/products/compute/serverless-inference/faq says to
  "replace your current inference API URL (such as OpenAI's base API URL) with
  Vultr’s API URL"
- **Base URL**: `https://api.vultrinference.com/v1`
- **Default model**: `glm-5.2`
- **Models in catalog**: 12 (curated from a 24-model roster: 15 entries with a
  text output, 3 rerank, 3 decision, 1 embeddings, 1 transcription and 1
  image). `nemotron-3.5-content-safety` (roster: "multimodal, multilingual
  content moderation"), `nemotron-3-nano-omni-30b-a3b-reasoning` and
  `qwen3.8-27b` are the three text-output roster entries that are not
  catalogued
- **Message shape**: the chat-completions request message schema lists `role`
  (`system`, `assistant`, `user`, `tool`, `developer`) and `content` (type
  `string`, "The contents of the message."); the tool call `id` description
  says "Send it back unchanged as the `tool_call_id` of the tool result."
  Not exercised live
- **Streaming**: supported — the chat-completions reference documents
  `stream` ("Indicates whether the response should be streamed.") and a
  `text/event-stream` response, and the roster lists `streaming: true` on the
  12 catalogued models
- **Tool calling**: `model-dependent` — the reference documents `tools` ("A
  list of function tools the model may call.") and `tool_calls` in responses;
  the roster lists `tools` among the supported parameters of the 12
  catalogued models, and the `nemotron-3.5-content-safety` entry does not
  list it
- **Tools while streaming**: declared (`true`) — the streaming payload schema
  in the OpenAPI document embedded in https://api.vultrinference.com/ says "A
  delta carries only the fields it adds (`role`, `content`, `reasoning`,
  `tool_calls`)". Not exercised live
- **Structured output**: not declared (`false`) — the chat-completions request
  schema lists `model`, `messages`, `continue_final_message`, `stream`,
  `max_tokens`, `max_completion_tokens`, `reasoning_effort`, `reasoning`, `n`,
  `seed`, `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`,
  `stop`, `logprobs`, `top_logprobs`, `tool_choice` and `tools`, and no
  `response_format`
- **Structured output + tools together**: not declared (`false`) — no
  combined probe was run without credentials
- **Embeddings**: not declared on this catalog entry. The reference lists a
  `POST /embeddings` route and the roster lists `qwen3-embedding-4b`, but
  NeuroLink's generic `ConfiguredOpenAICompatProvider` (which Tier-2 catalog
  entries use) does not implement `embed()`/`embedMany()`, so this flag
  tracks that, not the vendor's own API surface
- **Thinking**: not declared (`false`) — the reference documents
  `reasoning_effort` and a `reasoning` request object, and this entry has not
  been run with NeuroLink's `thinkingLevel` option
- **Billing**: the provisioning page lists a charges note to acknowledge, and
  the FAQ describes a Usage tab (see [Quick Start](#quick-start)). The entry
  records `no-free-tier` because the schema has no `unknown` value; it is not
  a Vultr statement
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://docs.vultr.com/products/compute/serverless-inference/provisioning and follow the Vultr Console steps: Products, Serverless, Inference, Add Serverless Inference, then provide a Label, "acknowledge the list of supported models and the charges note", and click Add Serverless Inference
2. Open the new subscription's management page and copy the API key from its overview page (https://docs.vultr.com/products/compute/serverless-inference/management/connection: "API key is necessary to send any request to the inference endpoints")
3. Charges: the provisioning page above lists the charges note among the items to acknowledge, and the FAQ (https://docs.vultr.com/products/compute/serverless-inference/faq) says the subscription's Usage tab shows "details on your current token usage, overage, and any associated costs"
4. Set `VULTR_INFERENCE_API_KEY` in your .env file (the authentication example on https://api.vultrinference.com/ writes `${VULTR_API_KEY}`, which NeuroLink does not read)

The FAQ also says the key can be regenerated from the Overview page in the
Vultr Console and that "This will invalidate the previous API key".

### 2. Configure

```bash
export VULTR_INFERENCE_API_KEY=your-api-key
export VULTR_INFERENCE_MODEL=glm-5.2   # optional — overrides the default model
export VULTR_INFERENCE_BASE_URL=https://api.vultrinference.com/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "vultr-inference",
  model: "glm-5.2",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider vultr-inference
```

Per-request credentials:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "vultr-inference",
  credentials: {
    vultrInference: { apiKey: process.env.VULTR_INFERENCE_API_KEY },
  },
});
```

---

## Models

| Model                    | Context   | Max output | Vision | $/M in · out  | Notes                                                                                                |
| ------------------------ | --------- | ---------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------- |
| `glm-5.2` ⭐             | 1,048,576 | 1,048,576  | yes    | $0.75 / $3    | NeuroLink default; roster: "GLM-5.2 is Z.ai's flagship model for long-horizon tasks".                |
| `deepseek-v4.1-flash`    | 1,048,576 | 1,048,576  | yes    | $0.15 / $0.6  | Fallback; roster: "support for reasoning and tool calling".                                          |
| `qwen3.8-flash-next`     | 262,144   | 262,144    | yes    | $0.1 / $0.2   | Fallback; roster: "reasoning, and tool calling".                                                     |
| `mimo-v2.6-flash-rl`     | 1,048,576 | 1,048,576  | yes    | $0.1 / $0.25  | Fallback; roster: "Supports reasoning and tool calling, served at FP8."                              |
| `deepseek-v4-flash-0731` | 1,048,576 | 1,048,576  | yes    | $0.1 / $0.25  | Roster: "DeepSeek's official V4 Flash release".                                                      |
| `glm-5.3`                | 1,048,576 | 1,048,576  | yes    | $0.75 / $3    | Roster: "Served at NVFP4 across a 1M-token context."                                                 |
| `glm-5.3-flash`          | 1,048,576 | 1,048,576  | yes    | $0.1 / $0.35  | Roster: "Z.ai's first natively multimodal GLM-5 model".                                              |
| `glm-5.x-menthol`        | 202,752   | 202,752    | yes    | $0.4 / $1.75  | Roster name "GLM 5"; "Z.ai's GLM-5, a 744B-parameter MoE flagship for agentic reasoning and coding". |
| `laguna-s-2.1`           | 1,048,576 | 1,048,576  | yes    | $0.09 / $0.18 | Roster: "designed for agentic coding and long-horizon work".                                         |
| `mimo-v2.6-pro-rl`       | 1,048,576 | 1,048,576  | yes    | $0.4 / $0.8   | Roster: "Supports reasoning and tool calling, served at FP8."                                        |
| `minimax-m3`             | 524,288   | 524,288    | yes    | $0.2 / $0.9   | The roster description text says a 1M-token context; the max_context_length field says 524,288.      |
| `muse-glimmer-30b`       | 131,072   | 131,072    | yes    | $0.25 / $1    | Roster: "a dense multimodal model for reasoning, coding, and tool use".                              |

Context, max output and prices come from the unauthenticated
`GET https://api.vultrinference.com/v1/models` call made 2026-09-29 (24
entries; 12 curated into this catalog). Context is the text input
`max_context_length`, max output is the output modality's `max_length`, and
prices are the roster's `cost_usd` per token for the prompt and completion
entries, multiplied by one million.

`models.defaultContextWindow` (131,072) and `models.defaultMaxOutputTokens`
(32,768) are placeholders for ids outside the catalog that the vendor does not
publish: 131,072 is the context the roster lists for `muse-glimmer-30b`, and
32,768 is the default the chat-completions page shows for
`max_completion_tokens`. Each model's `status` is `production`; the field is
required by the schema and the value is not a Vultr statement.

**Vision:** the roster lists `image` among the input modalities of the 12
catalogued models (sources `url` and `base64`; formats `image/png`,
`image/jpeg`, `image/webp`, `image/gif`), hence `vision: true`. See
**Message shape** under [Key Facts](#key-facts) for the request message
schema. No image request was sent.

**Fallback order** when the default is unavailable:
`deepseek-v4.1-flash` → `qwen3.8-flash-next` → `mimo-v2.6-flash-rl`. The
runtime fallback model name the loader derives (`fallbacks[1]`) is
`qwen3.8-flash-next`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Vultr Inference — **docs- and roster-verified,
not live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models`, HTTP 200, 24 models, 2026-09-29 — no key used                                                                                                                                                                                                                                                                                                                |
| Auth-failure shape        | unauthenticated `GET /v1/models/all` returned 401 `{"message":"No API key provided"}` (the same body on `GET /v1/usage` and `GET /v1/models/glm-5.2`); the body carries no error code. The chat-completions reference lists 401 "Unauthorized" and 429 "Rate limit exceeded". `GET /v1/chat/completions` answered 404 and no POST was sent, so `errorRules` match the statuses `401` and `429` |
| Billing                   | the provisioning page's Console steps say "acknowledge the list of supported models and the charges note"; the FAQ's Usage tab shows "details on your current token usage, overage, and any associated costs" — `billingPolicy` is the schema value `no-free-tier`, which is not a Vultr statement                                                                                             |
| Tools / structured output | `tools` and `tool_calls` are documented in the chat-completions reference; `response_format` is not in its request schema. Neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                               |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=vultr-inference` with a real key and record the result.                                                                                                                                                                 |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Documented error statuses

The chat-completions reference at https://api.vultrinference.com/ lists these
responses for `POST /chat/completions`, and says errors use OpenRouter's
envelope, `{"error": {"code", "message", "type", "metadata": {"error_type"}}}`:

| Status | Vultr's description                                                                         |
| ------ | ------------------------------------------------------------------------------------------- |
| 400    | "Bad Request, including `context_length_exceeded`"                                          |
| 401    | "Unauthorized"                                                                              |
| 422    | "Validation Error"; the `reasoning_effort` description says "unsupported levels return 422" |
| 429    | "Rate limit exceeded"                                                                       |
| 502    | "The model could not be reached"                                                            |
| 504    | "The model timed out"                                                                       |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
