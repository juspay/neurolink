---
title: Crusoe Provider Guide
description: Crusoe on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek-ai/DeepSeek-V4-Flash`
keywords: crusoe, serverless inference, openai-compatible, tier 2, provider setup, deepseek
---

# Crusoe Provider Guide

Crusoe is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/crusoe.json`) rather than hand-written code.
That file is the source of truth for this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** Crusoe's `GET https://api.inference.crusoecloud.com/v1/models`
> needs a key (it answers HTTP 401 without one), so the twelve model ids come
> from the vendor's public
> [Available models page](https://docs.crusoecloud.com/serverless-inference/available-models)
> and the roster has not been checked. No account was created and no API key
> was used to build this entry. `evidence.liveMatrix` is `null` until someone
> runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `crusoe`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the Available models
  page says "You can use the OpenAI-API compatible endpoint at
  api.inference.crusoecloud.com", and the
  [Getting Started page](https://docs.crusoecloud.com/quickstart/getting-started-with-serverless-inference)
  says "Crusoe's Serverless Inference Service provides OpenAI compatible
  endpoints"
- **Base URL**: `https://api.inference.crusoecloud.com/v1`
- **Default model**: `deepseek-ai/DeepSeek-V4-Flash`
- **Models in catalog**: 12 (ids copied from the Available models page, which
  lists 13; `nvidia/Nemotron-3-VoiceChat` has TYPE `speech-to-speech` and is
  not in this catalog)
- **Streaming**: supported — the developer hub's
  [LangChain README](https://github.com/crusoecloud/crusoe-developer-hub/blob/main/integrations/langchain/README.md)
  lists streaming among its features and shows `llm.stream(...)`, and the
  [Serverless Inference metrics page](https://docs.crusoecloud.com/serverless-inference/inference-metrics)
  lists the label `is_streaming` ("Whether the request used streaming")
- **Tool calling**: `model-dependent` — the developer hub's
  [Zed README](https://github.com/crusoecloud/crusoe-developer-hub/blob/main/integrations/zed/README.md)
  sets `"tools": true` for `openai/gpt-oss-120b`, and the LangChain README
  shows `llm.bind_tools([...])` followed by `response.tool_calls`
- **Tools while streaming**: not declared (`false`) — not exercised without
  credentials
- **Structured output**: not declared (`false`) — the LangChain README shows
  `llm.with_structured_output(Summary)`; the `response_format` parameter was
  not exercised without credentials
- **Structured output + tools together**: not declared (`false`) — no
  combined probe was possible without credentials
- **Embeddings**: not declared
- **Thinking**: not declared (`false`) — the Zed README says
  `openai/gpt-oss-120b` supports `reasoning_effort` values `low`, `medium` and
  `high`; the flag is provider-wide and stays `false`
- **Billing**: `free-with-card` — the vendor's own wording is quoted under
  [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.crusoecloud.com/request-foundry (the "Create a Managed AI account →" link on https://docs.crusoecloud.com/create-an-account, which says "Use Google or Github for the quickest signup.")
2. Create an API key: the Getting Started page (https://docs.crusoecloud.com/quickstart/getting-started-with-serverless-inference) says to visit the Intelligence Foundry on the console, select Inference from the left nav, click Create API Key, optionally provide an alias and expiration date, then click Create to view and save your API key
3. Billing as the vendor states it: see [Billing](#billing) below
4. Set `CRUSOE_API_KEY` in your .env file

### 2. Configure

```bash
export CRUSOE_API_KEY=your-api-key
export CRUSOE_MODEL=deepseek-ai/DeepSeek-V4-Flash   # optional — overrides the default model
export CRUSOE_BASE_URL=https://api.inference.crusoecloud.com/v1   # optional — overrides the base URL
```

The Getting Started page's Python example reads `CRUSOE_API_KEY`, the same
name NeuroLink reads. The developer hub's LangChain integration reads the base
URL from `CRUSOE_API_BASE`; NeuroLink reads `CRUSOE_BASE_URL`.

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "crusoe",
  model: "deepseek-ai/DeepSeek-V4-Flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider crusoe
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "crusoe",
  credentials: { crusoe: { apiKey: process.env.CRUSOE_API_KEY } },
});
```

---

## Billing

Three Crusoe pages are quoted here as printed; the entry records
`free-with-card`.

- The docs announcement bar
  ([Serverless Inference overview](https://docs.crusoecloud.com/serverless-inference/overview))
  reads "Use $5 in free credits to explore Serverless Inference and Serverless
  Fine-Tuning".
- The [Create an account page](https://docs.crusoecloud.com/create-an-account)
  says "To provision resources or use the managed inference service, you must
  enable billing on your account. You will need a valid, non-prepaid credit
  card to proceed."
- The [Serverless rate limits page](https://docs.crusoecloud.com/serverless-inference/rate-limits)
  lists default limits by account status:

| Account status       | TPM per model | RPM per model |
| -------------------- | ------------- | ------------- |
| No payment method    | 500,000       | 30            |
| Payment method added | 2,000,000     | 600           |

The Create an account page and the rate limits page's "No payment method" row
are both quoted above. `billingPolicy` is a required enum (`free-tier`,
`free-with-card`, `no-free-tier`) with no value for that difference, and
`free-with-card` is recorded.

The [Usage and billing page](https://docs.crusoecloud.com/serverless-inference/usage-billing-models)
lists the Billing of Serverless Inference as "Per-token" and points to
[crusoe.ai/cloud/pricing](https://www.crusoe.ai/cloud/pricing) for pricing
information.

---

## Models

| Model                                           | Context | Vision | $/M in · out (cached) | Notes                                                                                                                                                      |
| ----------------------------------------------- | ------- | ------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deepseek-ai/DeepSeek-V4-Flash` ⭐              | 1M      | no     | $0.14 / $0.28 ($0.03) | NeuroLink default.                                                                                                                                         |
| `deepseek-ai/DeepSeek-V4-Pro`                   | 1M      | no     | $1.74 / $3.48 ($0.15) | Fallback.                                                                                                                                                  |
| `openai/gpt-oss-120b`                           | 128k    | no     | $0.05 / $0.20 ($0.05) | Fallback. The Zed README sets `"tools": true` and `"images": false` for this id and says it supports `reasoning_effort` values `low`, `medium` and `high`. |
| `zai/GLM-5.3`                                   | 1M      | no     | $1.40 / $4.40 ($0.26) | Fallback.                                                                                                                                                  |
| `moonshotai/Kimi-K2.6`                          | 256K    | yes    | $0.70 / $3.50 ($0.35) | Fallback.                                                                                                                                                  |
| `google/gemma-4-31b-it`                         | 262k    | yes    | $0.14 / $0.40 ($0.14) | Fallback.                                                                                                                                                  |
| `nvidia/Nemotron-3-Nano-30B-A3B`                | 261,144 | no     | $0.05 / $0.20 ($0.03) | Fallback.                                                                                                                                                  |
| `nvidia/Nemotron-3-Super-120B-A12B`             | 261,144 | no     | $0.30 / $2.40 ($0.15) | Fallback.                                                                                                                                                  |
| `nvidia/Nemotron-3-Nano-Omni-Reasoning-30B-A3B` | 256,000 | yes    | $0.30 / $1.83 ($0.30) | Fallback; `models.visionModel`. Vision comes from the pricing row heading "(Text, Image, Video)".                                                          |
| `nvidia/nemotron-3.5-lightning-30b-a3b`         | 1M      | no     | $0.05 / $0.20 ($0.03) | Fallback.                                                                                                                                                  |
| `qwen/Qwen3.8-27B`                              | 256k    | yes    | —                     | Fallback.                                                                                                                                                  |
| `zai/GLM-5.3-Flash`                             | 1M      | yes    | $0.15 / $0.50 ($0.03) | Fallback.                                                                                                                                                  |

The model ids and context labels are copied from the
[Available models page](https://docs.crusoecloud.com/serverless-inference/available-models)
(retrieved 2026-09-29; TYPE column `instruct` on these twelve rows). The catalog records
each context label read as a decimal figure: "1M" as 1,000,000, "262k" as
262,000, "256K" and "256k" as 256,000, "128k" as 128,000. Three rows record a
figure from another Crusoe page in place of the Available models label "262k".
The [model hub](https://www.crusoe.ai/cloud/managed-inference) shows the Context
value "261,144" under the headings "Nemotron 3 Nano 30B A3B FP8" and "Nemotron 3
Super 120B A12B FP8", and 261,144 is recorded for both. For
`nvidia/Nemotron-3-Nano-Omni-Reasoning-30B-A3B` the hub shows the Context value
"256,000" under the heading "Nemotron 3 Nano Omni 30B A3B Reasoning", and the
[Crusoe blog post](https://www.crusoe.ai/resources/blog/nvidia-nemotron-3-nano-omni-now-available)
says "a 256K-token context window"; 256,000 is recorded. No per-model maximum
output is recorded.

Prices come from the Serverless Inference table on
[crusoe.ai/cloud/pricing](https://www.crusoe.ai/cloud/pricing) (retrieved
2026-09-29; header "(Price per 1 million tokens)", columns Input tokens, Output
tokens and Cached tokens). That table names models by two heading elements
rather than by id, for example "DeepSeek" and "V4 Flash", so each row was
matched to an id by those headings; the Available models page says "For each
model's pricing information, see pricing".

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(8,192) are conservative placeholders for model ids outside the catalog; the
vendor does not publish them.

**Vision:** `vision: true` is set for
`nvidia/Nemotron-3-Nano-Omni-Reasoning-30B-A3B`, from the pricing row headings
"Nemotron 3 Nano Omni 30B A3B Reasoning" and "(Text, Image, Video)", and for
four more ids from the sources below; the other seven ids are `vision: false`.
`vision` is a required boolean in the catalog schema, and `false` is a
placeholder on those seven ids except `openai/gpt-oss-120b`, where the Zed
README sets `"images": false`. No image request was sent, so vision has not been
probed.

- `moonshotai/Kimi-K2.6`: a
  [Crusoe blog post](https://www.crusoe.ai/resources/blog/430-tokens-per-second-optimizing-kimi-k2-6-and-k2-7-for-production)
  says "Kimi K2.6 is a native multimodal agentic model built for long-horizon
  coding, autonomous execution, tool use, and complex workflows." and the
  [model card](https://huggingface.co/moonshotai/Kimi-K2.6) linked from this id's
  row on the Available models page says "K2.6 supports Image and Video input."
- `google/gemma-4-31b-it`: the
  [model card](https://huggingface.co/google/gemma-4-31B-it) linked from this
  id's row on the Available models page says "Gemma 4 models are multimodal,
  handling text and image input (with audio supported on E2B, E4B, and 12B) and
  generating text output."
- `qwen/Qwen3.8-27B`: the
  [model card](https://huggingface.co/Qwen/Qwen3.8-27B) linked from this id's
  row on the Available models page says "Native support for image and video
  understanding, from STEM diagrams and documents to hour-scale videos."
- `zai/GLM-5.3-Flash`: the
  [model card](https://huggingface.co/zai-org/GLM-5.3-Flash) linked from this
  id's row on the Available models page says "the first natively multimodal model
  in the GLM-5 series", and the
  [Z.ai docs page](https://docs.z.ai/guides/llm/glm-5.3-flash) linked from that
  card shows the value "Video / Image / Text / File" under the card title "Input
  Modality".

**Fallback order** when the default is unavailable:
`deepseek-ai/DeepSeek-V4-Pro` → `openai/gpt-oss-120b` → `zai/GLM-5.3` →
`moonshotai/Kimi-K2.6` → `google/gemma-4-31b-it` →
`nvidia/Nemotron-3-Nano-30B-A3B` → `nvidia/Nemotron-3-Super-120B-A12B` →
`nvidia/Nemotron-3-Nano-Omni-Reasoning-30B-A3B` →
`nvidia/nemotron-3.5-lightning-30b-a3b` → `qwen/Qwen3.8-27B` →
`zai/GLM-5.3-Flash`. The runtime fallback model name the loader derives
(`fallbacks[1]`) is `openai/gpt-oss-120b`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Crusoe — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models` answered HTTP 401 on 2026-09-29, so the model ids come from the Available models page (retrieved 2026-09-29) and the roster has not been verified                                                                                                                             |
| Auth-failure shape        | unauthenticated `GET /v1/models` and `GET /v1/chat/completions` each answered HTTP 401 on 2026-09-29 with `content-type: application/json` and the body `{"errors":["Authentication failed"]}`. The body has no code field, so `authProbe` records the status and no code. `errorRules` carry 401, 429 and 503 |
| Billing                   | three public pages quoted under [Billing](#billing) above, 2026-09-29 — no signup performed                                                                                                                                                                                                                    |
| Tools / structured output | not exercised. Tool calling is shown in the developer hub's Zed and LangChain READMEs and structured output in the LangChain README; no request was sent, and no combined tools+schema request was sent, so `structuredOutputWithTools` stays `false`                                                          |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=crusoe` with a real key and record the result.                                                                                          |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

The causes and resolutions below are worded by Crusoe pages.

| Symptom               | Cause as the vendor states it                                                                                                                         | Resolution as the vendor states it                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 429              | "Your project exceeded its TPM or RPM limit for the model." ([Serverless rate limits](https://docs.crusoecloud.com/serverless-inference/rate-limits)) | "Both 429 and 503 responses are transient, so you can retry the request with exponential backoff rather than failing immediately." The same page links [Contact us](https://www.crusoe.ai/contact-sales) for a rate limit increase |
| HTTP 503              | "Your request is within your limits, but the shared endpoint is experiencing unusually high load and can't accept it right now." (same page)          | The same sentence as above: retry the request with exponential backoff                                                                                                                                                             |
| A deprecated model id | "Five Serverless Inference models were deprecated on September 12, 2026." (Available models page)                                                     | "Update your API calls to use a recommended replacement model from the table below." The page's table lists Z.ai GLM-5.1, Z.ai GLM-5.2, DeepSeek V3, Qwen3 235B A22B and Llama 3.3 70B as deprecated                               |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
