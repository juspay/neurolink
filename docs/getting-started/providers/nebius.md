---
title: Nebius Token Factory Provider Guide
description: Nebius Token Factory on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `Qwen/Qwen3-235B-A22B-Instruct-2507`
keywords: nebius, nebius token factory, openai-compatible, tier 2, provider setup, qwen, deepseek
---

# Nebius Token Factory Provider Guide

Nebius Token Factory is a **Tier-2 catalog provider**: OpenAI-wire-compatible,
with no catalog quirks set, so its entire integration is one JSON file
(`src/lib/providers/catalog/nebius.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified, not yet
> live-verified.** The vendor's `GET /v1/models` needs a key (an unauthenticated
> request answers HTTP 401), so the model ids come from the vendor's public model
> catalog and the roster has not been checked against the API. No account was
> created and no API key was used to build it. `evidence.liveMatrix` is `null`
> until someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `nebius`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the API introduction
  says "Nebius Token Factory offers an OpenAI-compatible API for inference and
  fine-tuning." ([docs](https://docs.tokenfactory.nebius.com/api-reference/introduction))
- **Base URL**: `https://api.tokenfactory.nebius.com/v1`
- **Default model**: `Qwen/Qwen3-235B-A22B-Instruct-2507`
- **Models in catalog**: 7, listed in the Models table below
- **Streaming**: supported — the chat completion reference documents `stream`,
  with data-only server-sent events and a stream "terminated by a `data: [DONE]`
  message" ([reference](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion))
- **Tool calling**: `model-dependent` — the
  [Function calling & Tools page](https://docs.tokenfactory.nebius.com/ai-models-inference/function-calling)
  documents `tools` and `tool_choice`, and the public model catalog lists
  `function_calling` in `use_cases` for 6 of the 7 models in this entry (not
  for `openbmb/MiniCPM-V-4_5`)
- **Tools while streaming**: declared (`true`) — the reference's streaming
  delta schema has a `tool_calls` field described as "The tool calls generated
  by the model, such as function calls."
- **Structured output**: declared (`true`) — the
  [Structured output & JSON page](https://docs.tokenfactory.nebius.com/ai-models-inference/json)
  documents `response_format` with `json_schema` and `json_object`, and says
  "Use `JSON mode` tag in on a model card to find a model with structured output
  supported." The public catalog carries the `JSON mode` tag on 6 of the 7
  models here: the default, the four fallbacks and `openbmb/MiniCPM-V-4_5`
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Vision**: `openbmb/MiniCPM-V-4_5` is `vision: true` (catalog type
  `image2text` with `image` in `use_cases`). The
  [Vision capabilities example](https://docs.tokenfactory.nebius.com/api-reference/examples/vision-capabilities)
  passes an image as `image_url`, either "A URL to the image" or "A base64
  encoded image directly in the request."
- **Embeddings**: not declared on this catalog entry. The public model catalog
  lists an `embedding` model type, but NeuroLink's generic
  `ConfiguredOpenAICompatProvider` (which Tier-2 catalog entries use) has
  no native `embed()`/`embedMany()` — `BaseProvider`'s default throws — so this
  flag tracks that, not the vendor's own API surface
- **Thinking**: not declared (`false`) — the reference lists a
  `reasoning_effort` request field (`none`, `minimal`, `low`, `medium`, `high`,
  `xhigh`, `max`) and `reasoning_content` / `reasoning` response fields; no
  request using them was sent
- **Billing**: `free-with-card` — the billing page says "Setting up a billing
  account requires a bank card." and "Upon first sign-up, you receive $1 in
  trial credit, valid for 30 days."
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://tokenfactory.nebius.com/ and create an account; the quickstart (https://docs.tokenfactory.nebius.com/quickstart) says: "Log in using your Google or GitHub account"
2. Create an API key (https://docs.tokenfactory.nebius.com/api-reference/introduction#authentication): go to the API keys section, click Create API key, enter the key name, click Create, and save the displayed key — "Save the displayed API key. You cannot open it later in Nebius Token Factory."
3. Billing (https://docs.tokenfactory.nebius.com/other-capabilities/billing-new): "Billing setup is mandatory—you cannot complete onboarding without it." "Setting up a billing account requires a bank card." "Upon first sign-up, you receive $1 in trial credit, valid for 30 days."
4. Set `NEBIUS_API_KEY` in your .env file (the vendor's docs read NEBIUS_API_KEY)

### 2. Configure

```bash
export NEBIUS_API_KEY=your-api-key
export NEBIUS_MODEL=Qwen/Qwen3-235B-A22B-Instruct-2507   # optional — overrides the default model
export NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "nebius",
  model: "Qwen/Qwen3-235B-A22B-Instruct-2507",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider nebius
```

Per-request credentials:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "nebius",
  credentials: { nebius: { apiKey: process.env.NEBIUS_API_KEY } },
});
```

---

## Models

| Model                                   | Context (`max_model_len`) | Vision | Price per M tokens, in / out | Notes                                                                  |
| --------------------------------------- | ------------------------- | ------ | ---------------------------- | ---------------------------------------------------------------------- |
| `Qwen/Qwen3-235B-A22B-Instruct-2507` ⭐ | 262,144                   | no     | 0.2 / 0.6                    | NeuroLink default; `JSON mode` tag; `function_calling` in `use_cases`. |
| `deepseek-ai/DeepSeek-V4-Flash-0731`    | 1,024,000                 | no     | 0.14 / 0.28                  | Fallback; `JSON mode` tag; `function_calling` in `use_cases`.          |
| `openai/gpt-oss-120b`                   | 131,072                   | no     | 0.15 / 0.6                   | Fallback; `JSON mode` tag; `function_calling` in `use_cases`.          |
| `Qwen/Qwen3-30B-A3B-Instruct-2507`      | 262,144                   | no     | 0.1 / 0.3                    | Fallback; `JSON mode` tag; `function_calling` in `use_cases`.          |
| `NousResearch/Hermes-4-405B`            | 131,072                   | no     | 1 / 3                        | Fallback; `JSON mode` tag; `function_calling` in `use_cases`.          |
| `nvidia/Nemotron-3_5-Lightning`         | 1,048,576                 | no     | 0.06 / 0.24                  | `function_calling` in `use_cases`.                                     |
| `openbmb/MiniCPM-V-4_5`                 | 32,000                    | yes    | 0.658 / 1.11                 | `JSON mode` tag; catalog type `image2text`; `models.visionModel`.      |

Model ids, context lengths and prices come from the vendor's public model
catalog, retrieved 2026-09-29:
[`/api/public/models_info`](https://tokenfactory.nebius.com/api/public/models_info)
(its Markdown view is at
[`/model-catalog.md`](https://tokenfactory.nebius.com/model-catalog.md), which
says "The JSON endpoint is the authoritative machine-readable source"). Context
is each model's `max_model_len`; the catalog also gives a rounded
`context_window_k`. Prices are the catalog's `input_price_per_million_tokens` and
`output_price_per_million_tokens` values, copied as published. The catalog's
`status: active` is recorded here as `production`.

The default and the four fallbacks are the models in this entry whose catalog
record carries both the `JSON mode` tag and `function_calling` in `use_cases`;
the other two follow in `topModels`.

**Vendor descriptions** (the public model catalog's `description` field, quoted):

- `Qwen/Qwen3-235B-A22B-Instruct-2507` — "Balanced Qwen3 flagship tuned for strong general reasoning, chat quality, and tool use."
- `deepseek-ai/DeepSeek-V4-Flash-0731` — "DeepSeek V4 Flash 0731 is a 1M-context reasoning model designed for coding and agentic workloads."
- `openai/gpt-oss-120b` — "Open-weight agentic model with configurable reasoning, full CoT visibility, strong tool use, and fine-tuning support."
- `Qwen/Qwen3-30B-A3B-Instruct-2507` — "Versatile 30B instruct model optimized for high-quality chat, reasoning, and coding."
- `NousResearch/Hermes-4-405B` — "Hybrid-reasoning model trained on verified CoT traces for strong math, coding, and step-by-step reliability."
- `nvidia/Nemotron-3_5-Lightning` — "NVIDIA's 30B-parameter hybrid MoE model with 3B active parameters per token, designed for efficient agentic reasoning, tool use, coding, and long-context workflows."
- `openbmb/MiniCPM-V-4_5` — "MiniCPM-V-4.5 – Compact multimodal model for image, multi-image, high-FPS/long-video, OCR/PDF understanding, with switchable fast/deep thinking."

`models.defaultMaxOutputTokens` (8,192) is the value the chat completion
reference gives for an omitted `max_tokens`: "If omitted or set to null,
defaults to 8192 tokens." `models.defaultContextWindow` (32,000) is a
placeholder the vendor does not publish.

The [inference overview](https://docs.tokenfactory.nebius.com/ai-models-inference/overview)
describes two model flavors, Base and Fast, and says: "To use the Fast flavor,
append `-fast` to the model name in the API." The ids in this entry are the ones
in the public model catalog's `flavors[].model_id`. Code samples in the docs name
other ids, for example `deepseek-ai/DeepSeek-R1-0528` on the quickstart and
`meta-llama/Meta-Llama-3.1-70B-Instruct` on the API introduction.

Nebius records serverless model removals in its
[June 2026](https://docs.tokenfactory.nebius.com/june-2026-deprecation-notice) and
[August 2026](https://docs.tokenfactory.nebius.com/august-2026-deprecation-notice)
deprecation notices, both of which say "Token Factory does not automatically
reroute requests from deprecated models." The August notice lists
`deepseek-ai/DeepSeek-V4-Flash-0731` and `nvidia/Nemotron-3_5-Lightning` in its
"Recommended Replacement" column.

**Fallback order** when the default is unavailable:
`deepseek-ai/DeepSeek-V4-Flash-0731` → `openai/gpt-oss-120b` →
`Qwen/Qwen3-30B-A3B-Instruct-2507` → `NousResearch/Hermes-4-405B`. The runtime
fallback model name the loader derives (`fallbacks[1]`) is `openai/gpt-oss-120b`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Nebius Token Factory — **docs-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models` answered HTTP 401 with `{"detail":"Couldn't authenticate. Reason: token is not present"}`, 2026-09-29 — no key used. Model ids are taken from the public model catalog (`/api/public/models_info`), so the roster is not verified against the API                                                                                                                                                                                                                                                                                     |
| Chat endpoint             | unauthenticated `GET /v1/chat/completions` answered HTTP 405 with `allow: POST` and `{"detail":"Method Not Allowed"}`, 2026-09-29; no POST was sent                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Billing                   | the [billing page](https://docs.tokenfactory.nebius.com/other-capabilities/billing-new) states a bank card is required to set up a billing account and a $1 trial credit valid for 30 days on first sign-up, 2026-09-29                                                                                                                                                                                                                                                                                                                                                |
| Error shapes              | statuses and example bodies from the [chat completion reference](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion): 401 `Couldn't authenticate. Reason: token is not present`, 402 `Payment Required: You have exhausted your budget. Please add funds to continue using the API.`, 404 ``The model `unknown-model` does not exist.``, 429 (response description "Rate limit exceeded"). `errorRules` match the status codes `401`, `402`, `404` and `429`; the 429 rule points to the `Retry-After` header on the rate-limits page |
| Tools / structured output | documented on the function-calling and structured-output pages; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`. The chat completion reference's `response_format` description reads `Only {'type': 'json_object'} or {'type': 'text' } is supported.`, while its `ResponseFormat` schema lists `text`, `json_object` and `json_schema`                                                                                                                                                          |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=nebius` with a real key and record the result.                                                                                                                                                                                                                                                                                                                                                  |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row uses a status and body the vendor's chat completion reference shows, or a
statement from a vendor page named in the row.

| Symptom                                       | Cause                                                                                                                                                         | Fix                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 401                                      | The reference's 401 example body is `Couldn't authenticate. Reason: token is not present`                                                                     | The API introduction says to include the key in the `Authorization: Bearer` header; NeuroLink sends `NEBIUS_API_KEY` that way                  |
| HTTP 402                                      | The reference's 402 example body is `Payment Required: You have exhausted your budget. Please add funds to continue using the API.`                           | Add funds — see "Topping up your balance" on the [billing page](https://docs.tokenfactory.nebius.com/other-capabilities/billing-new)           |
| HTTP 404                                      | The reference's 404 example body is ``The model `unknown-model` does not exist.``                                                                             | Take the id from the [public model catalog](https://tokenfactory.nebius.com/model-catalog.md)                                                  |
| HTTP 429                                      | The [rate-limits page](https://docs.tokenfactory.nebius.com/ai-models-inference/rate-limits) says "If you exceed the active limit you will receive HTTP 429." | The same page describes the `Retry-After` header as "The time in seconds to wait before making another request if the rate limit is exceeded." |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination                                                                                   | NeuroLink omits `response_format` automatically whenever tools are present, before sending                                                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
