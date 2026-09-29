---
title: Alibaba Cloud Model Studio (DashScope) Provider Guide
description: Alibaba Cloud Model Studio (DashScope) on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `qwen3.8-max`
keywords: dashscope, alibaba cloud, model studio, qwen, openai-compatible, tier 2, provider setup
---

# Alibaba Cloud Model Studio (DashScope) Provider Guide

Alibaba Cloud Model Studio (DashScope) is a **Tier-2 catalog provider**:
OpenAI-wire-compatible with no behavioural quirks, so its entire integration is
one JSON file (`src/lib/providers/catalog/dashscope.json`) rather than
hand-written code. That file is the source of truth for everything on this
page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `/models` endpoint needs a key (an
> unauthenticated GET of it returns HTTP 401), so the model ids come from the
> vendor's public documentation pages and the roster has not been checked
> against the API. No account was created and no API key was used to build it.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `dashscope`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the vendor's
  [first API call page](https://www.alibabacloud.com/help/en/model-studio/first-api-call-to-qwen)
  says "Alibaba Cloud Model Studio supports API calls to models through
  OpenAI-compatible interfaces and the DashScope SDK."
- **Base URL**: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` — the
  Singapore region, International deployment scope (see [Base URL](#base-url))
- **Default model**: `qwen3.8-max`
- **Models in catalog**: 8, taken from the vendor's
  [Models page](https://www.alibabacloud.com/help/en/model-studio/models),
  [text-generation page](https://www.alibabacloud.com/help/en/model-studio/text-generation-model)
  and [pricing page](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
  (retrieved 2026-09-29)
- **Streaming**: supported — the vendor's
  [Streaming output page](https://www.alibabacloud.com/help/en/model-studio/stream)
  describes Server-Sent Events, enabled by setting `stream` to `true`
- **Tool calling**: `model-dependent` — the Function Calling column on the
  text-generation page reads Supported for `qwen3.8-max`, `qwen3.8-max-0902`,
  `qwen3.8-flash`, `qwen3.7-plus`, `qwen3.7-flash`, `deepseek-v4-pro` and
  `deepseek-v4-flash` in its Recommended models table, and Unsupported for some
  models under Legacy models (for example `qwen2.5-omni-7b`). The
  [OpenAI-compatible Chat page](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions)
  documents the `tools` parameter
- **Tools while streaming**: supported — the
  [function calling page](https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling)
  has a Streaming output section that begins "Using streaming output lets you
  obtain the tool function name and input parameter information in real time"
- **Structured output**: supported — the
  [structured output page](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output)
  documents `response_format` in JSON Object and JSON Schema modes. Its JSON
  Object list includes `kimi-k3`, `deepseek-v4-pro` and `deepseek-v4-flash`;
  its JSON Schema list reads "Qwen3.7-Plus series, Qwen3.7-Flash series,
  Qwen3.7-Max series, Qwen3.8-Max series, and Qwen3.8-Flash series models."
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Embeddings**: not declared
- **Thinking**: `false` on this entry, because NeuroLink's `thinkingLevel`
  option has not been exercised against it (no credentials were used). The
  text-generation page lists Thinking mode as Supported for the ids in its
  Recommended models table, and the OpenAI-compatible Chat page documents the
  `enable_thinking` and `reasoning_effort` parameters
- **Billing**: `free-tier` — the vendor's
  [free quota page](https://www.alibabacloud.com/help/en/model-studio/new-free-quota)
  says "the platform automatically grants you a free quota for various models"
  on first activation of Model Studio (Singapore region)
- **Key format**: none declared. The vendor's
  [error-code page](https://www.alibabacloud.com/help/en/model-studio/error-code)
  says "Alibaba Cloud Model Studio API Keys start with `sk-`", and NeuroLink
  does not validate it

---

## Quick Start

### 1. Get an API key

1. Visit: https://account.alibabacloud.com/register/intl_register.htm and create an Alibaba Cloud account (linked from https://www.alibabacloud.com/help/en/model-studio/first-api-call-to-qwen)
2. Complete your account information, then open https://modelstudio.console.alibabacloud.com/ap-southeast-1 and agree to the service agreement to activate Model Studio (Singapore region); https://www.alibabacloud.com/help/en/model-studio/new-free-quota says the system then grants a free quota automatically
3. Create an API key at https://modelstudio.console.alibabacloud.com/ap-southeast-1/settings/api-key with the region set to Singapore; https://www.alibabacloud.com/help/en/model-studio/get-api-key states that each region has its own endpoint, API keys, and model list, and that they cannot be used across regions. Copy the key when it is shown
4. Free quota, per https://www.alibabacloud.com/help/en/model-studio/new-free-quota: valid for 90 days, typically 1,000,000 tokens for each model, and "After the free quota is exhausted, you are automatically billed on a pay-as-you-go basis."
5. Set `DASHSCOPE_API_KEY` in your .env file (the vendor's examples use the same variable name)

### 2. Configure

```bash
export DASHSCOPE_API_KEY=your-api-key
export DASHSCOPE_MODEL=qwen3.8-max   # optional — overrides the default model
export DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1   # optional — for example the workspace-dedicated domain
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "dashscope",
  model: "qwen3.8-max",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider dashscope
```

Per-request credentials are passed the same way as for the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "dashscope",
  credentials: { dashscope: { apiKey: process.env.DASHSCOPE_API_KEY } },
});
```

---

## Base URL

The catalog uses `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. The
vendor's [regions page](https://www.alibabacloud.com/help/en/model-studio/regions)
lists `dashscope-intl.aliyuncs.com` as the Singapore DashScope domain, labelled
"existing domain", and says the China (Beijing) and Singapore regions each
support one service deployment scope, Chinese mainland and International
respectively. The
[OpenAI-compatible Chat page](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions)
says "The existing domain remains fully functional."

The regions page also documents a workspace-dedicated domain,
`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`,
labelled "(recommended)" in its endpoint comparison. To use it, set
`DASHSCOPE_BASE_URL` to that URL with your workspace id. The same page states:
"The DashScope domain (dashscope.aliyuncs.com) will no longer support new
features after September 30, 2026."

---

## Models

| Model               | Context | Vision           | $/M in · out  | Notes                                                                                                                                                                                                                                      |
| ------------------- | ------- | ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `qwen3.8-max` ⭐    | 1M      | yes              | $2 / $6       | NeuroLink default. The model in the vendor's OpenAI-compatible examples; the text-generation page says "For the strongest reasoning, choose qwen3.8-max." Thinking mode, Function Calling, Built-in tools and Structured output Supported. |
| `qwen3.8-flash`     | 1M      | yes              | $0.15 / $0.47 | Fallback. Thinking mode, Function Calling, Built-in tools and Structured output Supported.                                                                                                                                                 |
| `qwen3.7-plus`      | 1M      | yes              | —             | Fallback. The text-generation page says "We recommend qwen3.7-plus for balanced performance and cost, with full tool calling and a 1M-token context window for large codebases."                                                           |
| `qwen3.8-max-0902`  | 1M      | yes              | $2 / $6       | Fallback. Thinking mode, Function Calling, Built-in tools and Structured output Supported.                                                                                                                                                 |
| `qwen3.7-flash`     | 1M      | yes              | —             | Fallback. Thinking mode, Function Calling, Built-in tools and Structured output Supported.                                                                                                                                                 |
| `deepseek-v4-pro`   | 1M      | no               | $2.40 / $4.80 | Fallback. Thinking mode, Function Calling and Structured output Supported; Built-in tools Unsupported.                                                                                                                                     |
| `deepseek-v4-flash` | 1M      | no (placeholder) | $0.20 / $0.40 | Fallback. Thinking mode, Function Calling and Structured output Supported; Built-in tools Unsupported.                                                                                                                                     |
| `kimi-k3`           | —       | yes              | $3 / $15      | Fallback. Named under Text generation and under Image & video, Understanding on the Models page.                                                                                                                                           |

Where the sources are:

- **Context, thinking mode, function calling, built-in tools, structured
  output**: the Recommended models table on the text-generation page. The `1M`
  label is recorded as 1,000,000, since the pricing page states "K means 1,000
  and M means 1,000,000". `kimi-k3` has no context figure in the catalog.
- **Prices**: the pricing page, Singapore tab, International deployment scope,
  per 1 million tokens, where the page gives one input price and one output
  price for the model. `qwen3.7-plus` and `qwen3.7-flash` are left to the
  pricing page itself.
- **Vision**: `yes` on the ids the vendor's
  [vision page](https://www.alibabacloud.com/help/en/model-studio/vision) names
  in its image-quantity limits ("Qwen3.8-Max, Qwen3.8-Flash, Qwen3.7-Plus
  series: Up to 2,048 images" and "Qwen3.7-Flash, Qwen3.6-Plus, Qwen3.6-Flash,
  Qwen3.5-Plus, Qwen3.5-Flash, Qwen3-VL, Qwen-VL, QVQ series: Up to 256
  images"), on `qwen3.8-max-0902`, which the Visual understanding page
  ([vision-model](https://www.alibabacloud.com/help/en/model-studio/vision-model))
  names in its Video support list ("Up to 2 hours / 2 GB") and whose Recommended
  models row lists Max images 2048 and Max videos 64, and on `kimi-k3`, which
  the Models page lists under Image & video, Understanding. `deepseek-v4-pro`
  carries `false`: the
  [error-code page](https://www.alibabacloud.com/help/en/model-studio/error-code)
  refers to "plain-text models like qwen3-max, qwen-plus, or deepseek-v4-pro".
  The schema requires a boolean, and `deepseek-v4-flash` carries `false` as a
  placeholder.

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(8,192) are conservative placeholders; the vendor does not publish a general
default. They apply wherever the catalog sets no value, which includes model ids
outside the catalog, the context window of `kimi-k3` and the max output tokens
of each catalog id.

**Fallback order** when the default is unavailable:
`qwen3.8-flash` → `qwen3.7-plus` → `qwen3.8-max-0902` → `qwen3.7-flash` →
`deepseek-v4-pro` → `deepseek-v4-flash` → `kimi-k3`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Alibaba Cloud Model Studio (DashScope) —
**docs-verified only, not live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /compatible-mode/v1/models`, HTTP 401 without a key, 2026-09-29. Model ids are taken from the vendor's text-generation and Models pages (retrieved 2026-09-29); the roster is not verified                                                                                                                                                  |
| Auth-failure shape        | the same GET returned a JSON body with `error.message` "You didn't provide an API key. You need to provide your API key in an Authorization header using Bearer auth (i.e. Authorization: Bearer YOUR_KEY).", `error.type` "invalid_request_error", `error.param` null, `error.code` null and a top-level `request_id`; `errorRules` carries a status `401` rule |
| Endpoint check            | an unauthenticated GET of `/compatible-mode/v1/chat/completions` answered HTTP 400 with `code` "InvalidParameter" and `message` "Request method 'GET' is not supported."; that message is also listed on the vendor's error-code page                                                                                                                            |
| Billing                   | the free quota page says "the platform automatically grants you a free quota for various models" on first activation (Singapore region), valid for 90 days, and "After the free quota is exhausted, you are automatically billed on a pay-as-you-go basis." — 2026-09-29                                                                                         |
| Other error rules         | `FreeTierOnly` (HTTP 403) and `Arrearage` (HTTP 400) rules follow the vendor's error-code page; neither was triggered                                                                                                                                                                                                                                            |
| Tools / structured output | documented on the function calling and structured output pages; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                            |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=dashscope` with a real key and record the result.                                                                                                                                         |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

The rows below restate what the vendor's
[error-code page](https://www.alibabacloud.com/help/en/model-studio/error-code)
gives for the named error.

| Symptom                                 | Cause the vendor lists                                                                                    | Fix the vendor lists                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| HTTP 401 `invalid_api_key`              | Among the causes: the API key and the base URL belong to different regions                                | Use an API key from the Singapore region page together with the Singapore base URL               |
| HTTP 403 `AllocationQuota.FreeTierOnly` | "Cause 2": the free quota exhaustion stop was enabled and requests were made after the free quota ran out | Disable the free quota exhaustion stop switch to continue on a paid basis                        |
| HTTP 400 `Arrearage`                    | The Alibaba Cloud account associated with the API key has an overdue payment                              | Check Expenses and Costs on the vendor's billing console and recharge                            |
| HTTP 404 `model_not_found`              | The model does not exist, or Model Studio has not been activated                                          | Compare the `model` value with the Models page; activate model services in the Model Marketplace |
| HTTP 429 `Throttling`                   | API calls triggered rate limiting                                                                         | "Reduce call frequency or retry later."                                                          |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
