---
title: SiliconFlow Provider Guide
description: SiliconFlow on NeuroLink — Tier-2 catalog provider, default model `deepseek-ai/DeepSeek-V4-Pro`
keywords: siliconflow, tier 2, provider setup, deepseek, qwen, glm, kimi
---

# SiliconFlow Provider Guide

SiliconFlow is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/siliconflow.json`) rather than hand-written code.
That file is the source of truth for the values on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** SiliconFlow's `GET https://api.siliconflow.com/v1/models`
> answers HTTP 401 without a key, so the model ids come from SiliconFlow's
> public docs and model pages and the roster has not been checked. No account
> was created and no API key was used to build the entry.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `siliconflow`
- **Protocol**: `POST /chat/completions` with bearer auth — the
  [chat-completions API reference](https://docs.siliconflow.com/en/api-reference/chat-completions/chat-completions)
  lists the server `https://api.siliconflow.com/v1` and `POST /chat/completions`
  with bearer auth. The
  [Text Generation](https://docs.siliconflow.com/en/userguide/capabilities/text-generation)
  page says "You can make end-to-end API requests using the OpenAI SDK" and the
  [Quick Start](https://docs.siliconflow.com/en/userguide/quickstart) says "The
  platform currently supports most OpenAI-related parameters."
- **Base URL**: `https://api.siliconflow.com/v1`
- **Default model**: `deepseek-ai/DeepSeek-V4-Pro`
- **Models in catalog**: 12 — ids taken from the model enums of the
  chat-completions API reference and matching the ids shown on the model pages
  (linked under [See also](#see-also)); roster not verified
- **Messages array**: the API reference's request schema for `messages` shows
  `minItems: 1` and `maxItems: 10`
- **Streaming**: supported — the API reference documents `stream`: "If set,
  tokens are returned as Server-Sent Events as they are made available." The
  [Stream Mode](https://docs.siliconflow.com/en/faqs/stream-mode) page shows
  `stream=True` with the OpenAI library
- **Tool calling**: `model-dependent` — the
  [Function Calling](https://docs.siliconflow.com/en/userguide/guides/function-calling)
  page says "The Function Calling feature allows the model to call external
  tools to enhance its capabilities." and the API reference documents `tools`
  ("A max of 128 functions are supported."). The model pages show a Tools field
  as "Supported" or "Not supported" per model: "Supported" on the 12 catalog
  models and "Not supported" on
  [openai/gpt-oss-120b](https://www.siliconflow.com/models/gpt-oss-120b). None of it
  was exercised
- **Tools while streaming**: not declared (`false`)
- **Structured output**: not declared (`false`) — Structured Outputs reads "Not
  supported" on the 12 catalog model pages. The
  [JSON Mode](https://docs.siliconflow.com/en/userguide/guides/json-mode) page
  documents `response_format={"type": "json_object"}` and says "Currently,
  online models, except for the DeepSeek R1 series and V3 models, support the
  above parameter." JSON Mode reads "Supported" on 10 of the 12 catalog model
  pages, among them `deepseek-ai/DeepSeek-V3.2`, `deepseek-ai/DeepSeek-V4-Pro`
  and `deepseek-ai/DeepSeek-V4-Flash`, and "Not supported" on `zai-org/GLM-5.1`
  and `zai-org/GLM-5`. The entry sets no `responseFormatDowngrade` quirk
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared (`false`) — SiliconFlow documents a
  `POST /embeddings` route
  ([Create embeddings](https://docs.siliconflow.com/en/api-reference/embeddings/create-embeddings)).
  `src/lib/providers/configuredOpenAICompat.ts`, which the catalog entries use,
  contains no `embed()`/`embedMany()` implementation, so this flag tracks that,
  not the vendor's API surface
- **Thinking**: not declared (`false`) — the API reference documents
  `enable_thinking` ("Switches between thinking and non-thinking modes. Default
  is True.") with the models it supports, `thinking_budget`, and a
  `reasoning_content` response field. This entry sends none of them
- **Vision**: `true` for six catalog models whose model page shows Support image
  input "Supported": `moonshotai/Kimi-K2.6`, `moonshotai/Kimi-K2.5`,
  `Qwen/Qwen3.6-27B`, `Qwen/Qwen3.6-35B-A3B`, `Qwen/Qwen3-VL-32B-Instruct` and
  `google/gemma-4-31B-it`. `models.visionModel` is
  `Qwen/Qwen3-VL-32B-Instruct`, the `default` of the API reference's VLM request
  schema, which lists it in its model enum. For `moonshotai/Kimi-K2.6`,
  `moonshotai/Kimi-K2.5`, `Qwen/Qwen3.6-27B`, `Qwen/Qwen3.6-35B-A3B` and
  `google/gemma-4-31B-it` the flag rests on the model page value; image input
  was not exercised
- **Billing**: `free-tier` — see [Billing](#billing) below
- **Key format**: not validated by NeuroLink (`apiKeyFormat: null`)

---

## Quick Start

### 1. Get an API key

1. Visit: https://cloud.siliconflow.com/ and create a SiliconFlow account (https://docs.siliconflow.com/en/userguide/quickstart)
2. Open the API Keys page at https://cloud.siliconflow.com/account/ak, click Create API Key and copy the key (https://docs.siliconflow.com/en/userguide/quickstart)
3. Billing as the vendor words it on https://www.siliconflow.com/pricing: "Flexible token pricing, high usage limits, and postpaid billing—plus $1 in free credits to get you started!"
4. Set `SILICONFLOW_API_KEY` in your .env file

### 2. Configure

```bash
export SILICONFLOW_API_KEY=your-api-key
export SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V4-Pro   # optional — overrides the default model
export SILICONFLOW_BASE_URL=https://api.siliconflow.com/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "siliconflow",
  model: "deepseek-ai/DeepSeek-V4-Pro",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider siliconflow
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "siliconflow",
  credentials: { siliconflow: { apiKey: process.env.SILICONFLOW_API_KEY } },
});
```

---

## Billing

SiliconFlow's [pricing page](https://www.siliconflow.com/pricing) says:
"Flexible token pricing, high usage limits, and postpaid billing—plus $1 in free
credits to get you started!" Its FAQ answers "Are there any minimum
commitments?" with "No, there are no minimum commitments. You only pay for what
you use, and you can start with $1 in free credits." The entry records
`free-tier`.

The [Error Handling](https://docs.siliconflow.com/en/faqs/error-code) page
says of HTTP 403: "The most common reason is that the model requires real-name
authentication."

---

## Models

| Model                            | Context | Max tokens | Vision | Tools     | JSON Mode     | $/M in · out (cache read)  | Notes                                                                                                                                     |
| -------------------------------- | ------- | ---------- | ------ | --------- | ------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `deepseek-ai/DeepSeek-V4-Pro` ⭐ | 1049K   | 393K       | no     | Supported | Supported     | $1.50162 / $3.135 ($0.135) | NeuroLink default. About text begins "DeepSeek-V4-Pro is DeepSeek's flagship open-source MoE model".                                      |
| `deepseek-ai/DeepSeek-V4-Flash`  | 1049K   | 393K       | no     | Supported | Supported     | $0.13 / $0.28 ($0.028)     | About text begins "DeepSeek-V4-Flash is DeepSeek's latest open-source MoE model".                                                         |
| `deepseek-ai/DeepSeek-V3.2`      | 164K    | 164K       | no     | Supported | Supported     | $0.27 / $0.42 ($0.135)     | About text begins "DeepSeek-V3.2 is a model that harmonizes high computational efficiency with superior reasoning and agent performance". |
| `zai-org/GLM-5.1`                | 205K    | 131K       | no     | Supported | Not supported | $1.19 / $3.74 ($0.6)       | About text begins "GLM-5.1 is Z.ai's next-generation flagship model built for agentic engineering".                                       |
| `zai-org/GLM-5`                  | 205K    | 131K       | no     | Supported | Not supported | $0.95 / $2.55 ($0.2)       | About text begins "GLM-5 is a next-generation open-source model for complex systems engineering and long-horizon agentic tasks".          |
| `moonshotai/Kimi-K2.6`           | 262K    | 262K       | yes    | Supported | Supported     | $0.77 / $3.4 ($0.14)       | About text begins "Kimi K2.6 is an open-source, native multimodal agentic model by Moonshot AI".                                          |
| `moonshotai/Kimi-K2.5`           | 262K    | 262K       | yes    | Supported | Supported     | $0.45 / $2.25 ($0.07)      | About text begins "Kimi K2.5 is an open-source, native multimodal agentic model".                                                         |
| `Qwen/Qwen3.6-27B`               | 262K    | 262K       | yes    | Supported | Supported     | $0.3 / $3.2                | About text begins "Qwen3.6-27B is the first open-weight small-to-mid-sized dense model in the Qwen3.6 series".                            |
| `Qwen/Qwen3.6-35B-A3B`           | 262K    | 262K       | yes    | Supported | Supported     | $0.24 / $1.8 ($0.15)       | About text begins "Qwen3.6-35B-A3B is a large language model from Alibaba's Qwen3.6 series".                                              |
| `Qwen/Qwen3-32B`                 | 131K    | not set    | no     | Supported | Supported     | $0.14 / $0.57              | About text begins "Qwen3-32B is the latest large language model in the Qwen series with 32.8B parameters".                                |
| `Qwen/Qwen3-VL-32B-Instruct`     | 262K    | 262K       | yes    | Supported | Supported     | $0.2 / $0.6                | About text begins "Qwen3-VL is the vision-language model in the Qwen3 series".                                                            |
| `google/gemma-4-31B-it`          | 262K    | 262K       | yes    | Supported | Supported     | $0.75 / $1.0 ($0.25)       | About text begins "Gemma 4 31B is Google DeepMind's latest open-source model".                                                            |

Context, max tokens, prices and the Tools, JSON Mode and Support image input
values come from the model pages at `https://www.siliconflow.com/models/<slug>`
(retrieved 2026-09-29). The Context and Max tokens columns show the page's "K"
values; the catalog records them as thousands (`1049K` is stored as 1,049,000).
Prices are the page's Input Price, Output Price and Cache Read figures, shown
with a $ sign per "/ M Tokens". The [pricing page](https://www.siliconflow.com/pricing)
shows the same context length and prices for `deepseek-ai/DeepSeek-V4-Pro`,
`zai-org/GLM-5.1`, `zai-org/GLM-5`, `moonshotai/Kimi-K2.6`,
`moonshotai/Kimi-K2.5`, `Qwen/Qwen3.6-27B`, `Qwen/Qwen3.6-35B-A3B` and
`google/gemma-4-31B-it`, under the names without the organisation prefix. The
12 ids are copied from the model enums of the API reference and match the ids on
their model pages.

`Qwen/Qwen3-32B` has no `maxOutputTokens` in the catalog. Its model page shows
Max Tokens "131K", and the [Reasoning](https://docs.siliconflow.com/en/userguide/capabilities/reasoning)
page lists the Qwen3 Series with Maximum Response Length 8192, Maximum Reasoning
Chain Length 32768 and Maximum Context Length 131072.

`models.defaultContextWindow` (32,768) and `models.defaultMaxOutputTokens`
(4,096) are placeholders for ids outside the catalog that the vendor does not
publish. The `status` of the catalog models is `production`, a value the
schema requires, not a SiliconFlow statement.

**Fallback order** when the default is unavailable:
`deepseek-ai/DeepSeek-V4-Flash` → `deepseek-ai/DeepSeek-V3.2` →
`zai-org/GLM-5.1` → `moonshotai/Kimi-K2.6` → `Qwen/Qwen3-32B`. The order is
NeuroLink's choice, not a vendor ranking. The runtime fallback model name the
loader derives (`fallbacks[1]`) is `deepseek-ai/DeepSeek-V3.2`.

---

## Reasoning fields

The API reference documents `enable_thinking` ("Switches between thinking and
non-thinking modes. Default is True.") for a list of models that includes
`deepseek-ai/DeepSeek-V3.2`, `thinking_budget` ("Maximum number of tokens for
chain-of-thought output.") and a `reasoning_content` field on the response
message. The [Reasoning](https://docs.siliconflow.com/en/userguide/capabilities/reasoning)
page says: "reasoning_content: Reasoning chain content, at the same level as
content." This catalog entry does not send `enable_thinking` or
`thinking_budget`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for SiliconFlow — **docs-verified only, not live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://api.siliconflow.com/v1/models` answers HTTP 401 without a key (2026-09-29), so model ids are taken from the [API reference](https://docs.siliconflow.com/en/api-reference/chat-completions/chat-completions) and the model pages (retrieved 2026-09-29); **roster not verified**                                                                                                                                                                                                                                                                                                                    |
| Auth-failure shape        | unauthenticated `GET https://api.siliconflow.com/v1/models` returned HTTP 401 with body `{"code":30014,"data":null,"message":"Token is invalid."}` and header `www-authenticate: Bearer realm="siliconflow", error="invalid_token", error_description="Token is invalid."` (2026-09-29). An unauthenticated `GET https://api.siliconflow.com/v1/chat/completions` returned HTTP 404 with `content-type: text/plain` and the body `Not Found`. No POST was sent, so the 401 rule rests on the GET above, and the 403, 429 and model-not-found rules on the [Error Handling](https://docs.siliconflow.com/en/faqs/error-code) page |
| Billing                   | public [pricing page](https://www.siliconflow.com/pricing) statements quoted in [Billing](#billing) above, 2026-09-29                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Tools / structured output | function calling is documented on the Function Calling page and `response_format` on the JSON Mode page; nothing was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                                                                                                                                                                                                                                   |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=siliconflow` with a real key and record the result.                                                                                                                                                                                                                                                                                                                                                                                                       |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Causes and fixes in quotation marks are SiliconFlow's wording, with the page
named.

| Symptom                                | Cause                                                                                                                                                                                                                                                             | Fix                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 401                               | "API Key is not properly set." ([Error Handling](https://docs.siliconflow.com/en/faqs/error-code))                                                                                                                                                                | "Verify the API Key" ([Text Generation](https://docs.siliconflow.com/en/userguide/capabilities/text-generation), error code table)                                                                                                                                                                                                                        |
| HTTP 403                               | "The most common reason is that the model requires real-name authentication." ([Error Handling](https://docs.siliconflow.com/en/faqs/error-code))                                                                                                                 | "For other cases, refer to the error message (message)." ([Error Handling](https://docs.siliconflow.com/en/faqs/error-code))                                                                                                                                                                                                                              |
| HTTP 429                               | "Rate limits triggered." ([Error Handling](https://docs.siliconflow.com/en/faqs/error-code))                                                                                                                                                                      | "Refer to the error message (message) to determine whether the issue is related to RPM / RPD / TPM / TPD / IPM / IPD." ([Error Handling](https://docs.siliconflow.com/en/faqs/error-code)); "Implement exponential backoff retry mechanism" ([Text Generation](https://docs.siliconflow.com/en/userguide/capabilities/text-generation), error code table) |
| HTTP 503 or 504                        | "Generally caused by high system load." ([Error Handling](https://docs.siliconflow.com/en/faqs/error-code))                                                                                                                                                       | "You can try again later." and "you can try using streaming output" ([Error Handling](https://docs.siliconflow.com/en/faqs/error-code))                                                                                                                                                                                                                   |
| HTTP 400 with code 20012               | The Error Handling page lists 400 as "Incorrect parameters." and shows the message "Model does not exist. Please check it carefully."                                                                                                                             | "Refer to the error message (message) to correct invalid request parameters." ([Error Handling](https://docs.siliconflow.com/en/faqs/error-code))                                                                                                                                                                                                         |
| `max_tokens` set to the context length | "As some services are still being updated, avoid setting max_tokens to the window’s upper bound; reserve ~10k tokens as buffer for input and system overhead." ([API reference](https://docs.siliconflow.com/en/api-reference/chat-completions/chat-completions)) | "Ensure that input tokens + max_tokens do not exceed the model’s context window." (same page)                                                                                                                                                                                                                                                             |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
- SiliconFlow pages this entry was built from:
  [Quick Start](https://docs.siliconflow.com/en/userguide/quickstart),
  [Text Generation](https://docs.siliconflow.com/en/userguide/capabilities/text-generation),
  [Chat completions API reference](https://docs.siliconflow.com/en/api-reference/chat-completions/chat-completions),
  [List models](https://docs.siliconflow.com/en/api-reference/models/get-model-list),
  [Create embeddings](https://docs.siliconflow.com/en/api-reference/embeddings/create-embeddings),
  [Function Calling](https://docs.siliconflow.com/en/userguide/guides/function-calling),
  [JSON Mode](https://docs.siliconflow.com/en/userguide/guides/json-mode),
  [Reasoning](https://docs.siliconflow.com/en/userguide/capabilities/reasoning),
  [Stream Mode](https://docs.siliconflow.com/en/faqs/stream-mode),
  [Error Handling](https://docs.siliconflow.com/en/faqs/error-code),
  [Documentation index](https://docs.siliconflow.com/llms.txt),
  [Pricing](https://www.siliconflow.com/pricing),
  [Models](https://www.siliconflow.com/models),
  [SiliconFlow console](https://cloud.siliconflow.com/),
  [API Keys](https://cloud.siliconflow.com/account/ak)
- SiliconFlow model pages (retrieved 2026-09-29):
  [DeepSeek-V4-Pro](https://www.siliconflow.com/models/deepseek-v4-pro),
  [DeepSeek-V4-Flash](https://www.siliconflow.com/models/deepseek-v4-flash),
  [DeepSeek-V3.2](https://www.siliconflow.com/models/deepseek-v3-2),
  [GLM-5.1](https://www.siliconflow.com/models/glm-5-1),
  [GLM-5](https://www.siliconflow.com/models/glm-5),
  [Kimi-K2.6](https://www.siliconflow.com/models/kimi-k2-6),
  [Kimi-K2.5](https://www.siliconflow.com/models/kimi-k2-5),
  [Qwen3.6-27B](https://www.siliconflow.com/models/qwen3-6-27b),
  [Qwen3.6-35B-A3B](https://www.siliconflow.com/models/qwen3-6-35b-a3b),
  [Qwen3-32B](https://www.siliconflow.com/models/qwen3-32b),
  [Qwen3-VL-32B-Instruct](https://www.siliconflow.com/models/qwen3-vl-32b-instruct),
  [gemma-4-31B-it](https://www.siliconflow.com/models/gemma-4-31b-it),
  [openai/gpt-oss-120b](https://www.siliconflow.com/models/gpt-oss-120b)
