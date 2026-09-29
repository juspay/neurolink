---
title: Wafer Provider Guide
description: Wafer on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `GLM-5.3`
keywords: wafer, openai-compatible, tier 2, provider setup, glm, kimi, deepseek, qwen
---

# Wafer Provider Guide

Wafer is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/wafer.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** The fields below come from Wafer's own public pages and
> unauthenticated `GET` requests — no account was created and no API key was
> used to build it. `evidence.liveMatrix` is `null` until someone runs the
> live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `wafer`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the docs open with
  "Access Wafer models through an OpenAI-compatible API."
  ([docs](https://docs.wafer.ai/serverless))
- **Base URL**: `https://pass.wafer.ai/v1`
- **Authentication**: the docs' Connect table shows
  `Authorization: Bearer <YOUR_WAFER_API_KEY>`
- **Default model**: `GLM-5.3`
- **Models in catalog**: 8 (the 8 models on the 2026-09-29 roster)
- **Streaming**: `true` — the roster lists `chat_completions.streaming: true`
  on the 8 models
- **Tool calling**: `true` — the roster lists `chat_completions.tools: true`
  on the 8 models
- **Tools while streaming**: `true` — the roster lists
  `chat_completions.tool_streaming: true` on the 8 models
- **Structured output**: `true` — the roster lists
  `chat_completions.json_object: true` and `chat_completions.json_schema: true`
  on the 8 models
- **Structured output + tools together**: `false` — the roster lists
  `chat_completions.tools_with_response_format: true`, and no combined
  tools+schema request was sent, so the entry does not declare it
- **Embeddings**: not declared (`false`)
- **Thinking**: not declared (`false`) — the roster lists `reasoning: true` and
  a `reasoning_effort` block on the 8 models (see [Models](#models)); no
  `thinkingLevel` request was sent
- **Billing policy field**: `no-free-tier` — see [Billing](#billing)
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://app.wafer.ai and sign in — the docs say "Sign in at app.wafer.ai to add credits and create an API key. Store your key securely." (https://docs.wafer.ai/serverless)
2. Add credits and create an API key — the docs say "Add credits, create an API key, and pay per token." (https://docs.wafer.ai/serverless)
3. Set `WAFER_API_KEY` in your .env file (the docs' Authentication row shows the `Authorization: Bearer` header)

### 2. Configure

```bash
export WAFER_API_KEY=your-api-key
export WAFER_MODEL=GLM-5.3   # optional — overrides the default model
export WAFER_BASE_URL=https://pass.wafer.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "wafer",
  model: "GLM-5.3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider wafer
```

Per-request credentials use the same shape as other NeuroLink providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "wafer",
  credentials: { wafer: { apiKey: process.env.WAFER_API_KEY } },
});
```

---

## Billing

The docs page https://docs.wafer.ai/serverless says: "Access Wafer models
through an OpenAI-compatible API. Add credits, create an API key, and pay per
token." Wafer's information page https://www.wafer.ai/ai-info says: "Hosted
open models through an OpenAI-compatible API, with usage billed per token.
Customers add credits and create an API key in the Wafer app."

The catalog's `billingPolicy` field takes one of `free-tier`,
`free-with-card` or `no-free-tier`; the schema has no `unknown` value. The
entry records `no-free-tier` as the schema's closest choice — it is not a
Wafer statement.

---

## Models

| Model                         | Context   | Max output | Vision | $/M in · out (cache read) | Notes                                                                                                   |
| ----------------------------- | --------- | ---------- | ------ | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GLM-5.3` ⭐                  | 1,048,576 | —          | no     | $0.29 / $4.40 ($0.2359)   | NeuroLink default; the model in the docs' curl request examples.                                        |
| `DeepSeek-V4-Pro`             | 1,048,576 | —          | no     | $0.40 / $4.20 ($0.32)     | Fallback.                                                                                               |
| `Kimi-K3`                     | 1,048,576 | 131,072    | yes    | $1.44 / $9.00 ($0.30)     | Fallback; roster `capabilities.vision: true`.                                                           |
| `GLM-5.2`                     | 1,048,576 | —          | no     | $0.32 / $4.40 ($0.2599)   | Fallback.                                                                                               |
| `Qwen3.8-27B`                 | 262,144   | —          | yes    | $0.04 / $4.40 ($0.0342)   | Roster `capabilities.vision: true`; `models.visionModel`.                                               |
| `GLM-5.3-Flash`               | 1,048,576 | —          | yes    | $0.75 / $0.50 ($0.03)     | Roster `capabilities.vision: true`; roster description ends "Available serverless to gateway partners." |
| `DeepSeek-V4.1-Flash`         | 1,048,576 | —          | yes    | $0.02 / $0.70 ($0.016)    | Roster `capabilities.vision: true`.                                                                     |
| `DeepSeek-V4-Flash-0731-Fast` | 1,048,576 | —          | no     | $0.07 / $0.35 ($0.0531)   | Roster-listed.                                                                                          |

Context, max output, prices and vision come from an unauthenticated
`GET https://pass.wafer.ai/v1/models` made 2026-09-29 (8 models; the 8 are in
this catalog). The roster gives prices as integer cents per million tokens
(`input_cents_per_million`, `output_cents_per_million`), shown above divided by 100. The cache-read figure uses `cache_read_microcents_per_million`, which
carries more digits than the cents field (for `GLM-5.3`: 23,590,000 microcents,
shown as $0.2359; the cents field reads 24). The roster lists
`max_output_tokens: 131072` for `Kimi-K3`. The docs say "Use a model’s id in your
requests." ([docs](https://docs.wafer.ai/serverless))

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(16,384) are placeholders the vendor does not publish; they apply to a model id
outside the catalog.

Vision tags (`vision: true`) come from the roster's `capabilities.vision` and
`supports_vision` fields, not from an image-input request — no key was used to
send a real image.

**Fallback order** when the default is unavailable:
`DeepSeek-V4-Pro` → `Kimi-K3` → `GLM-5.2`. The runtime fallback model name the
loader derives (`fallbacks[1]`) is `Kimi-K3`.

### Roster descriptions

The strings below are the `wafer.description` field of the roster entries,
quoted as returned by `GET https://pass.wafer.ai/v1/models` on 2026-09-29.

- `GLM-5.3`: "GLM-5.3 — Z.ai's flagship GLM-5.3 MoE (391B, NVFP4), self-hosted on the Wafer fleet with a 1M-token context window and frontier coding/agentic performance. Available serverless."
- `DeepSeek-V4-Pro`: "DeepSeek-V4-Pro -- DeepSeek's V4 Pro MoE, self-hosted on the Wafer fleet with a 1M-token context window, reasoning-effort control and tool calling. Available serverless."
- `Kimi-K3`: "Kimi K3 sparse MoE model, self-hosted on the Wafer fleet. Available serverless with a 1M-token context window and strong coding/agentic performance."
- `GLM-5.2`: "GLM-5.2 — Z.ai's GLM-5.2 MoE (NVFP4), self-hosted on the Wafer fleet with a 1M-token context window, strong coding and reasoning, and tool calling. Available serverless."
- `Qwen3.8-27B`: "Qwen3.8-27B -- Alibaba's dense 27B vision-language model, self-hosted on the Wafer fleet with a 262K-token context window, image and video input, reasoning-effort control and tool calling. Available serverless."
- `GLM-5.3-Flash`: "GLM-5.3-Flash — Z.ai's fast GLM-5.3 MoE variant, self-hosted on the Wafer fleet with a 1M-token context window and strong coding/agentic performance. Available serverless to gateway partners."
- `DeepSeek-V4.1-Flash`: "DeepSeek-V4.1-Flash — DeepSeek's V4.1 Flash MoE (552B total, 8B active for prefill / 16B for decode, 1M-token context), self-hosted on the Wafer fleet with reasoning-effort control and tool calling. Available serverless."
- `DeepSeek-V4-Flash-0731-Fast`: "The same model served for high TPS."

### Roster `reasoning_effort` blocks

The roster lists a `reasoning_effort` block on the 8 models
(`control`, `efforts`, `default`). These are roster values; no request set an
effort.

| Model                                                                                   | `control`       | `efforts`                    | `default` |
| --------------------------------------------------------------------------------------- | --------------- | ---------------------------- | --------- |
| `GLM-5.3`, `GLM-5.2`, `GLM-5.3-Flash`, `DeepSeek-V4-Pro`, `DeepSeek-V4-Flash-0731-Fast` | `system_prompt` | none, low, high, max         | low       |
| `Kimi-K3`                                                                               | `native_effort` | none, high, max              | none      |
| `Qwen3.8-27B`                                                                           | `native_effort` | none, low, medium, high, max | high      |
| `DeepSeek-V4.1-Flash`                                                                   | `native_effort` | none, low, high, max         | none      |

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Wafer — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://pass.wafer.ai/v1/models`, HTTP 200, 8 models, 2026-09-29 — no key used                                                                                                                                                                                            |
| Billing                   | https://docs.wafer.ai/serverless: "Add credits, create an API key, and pay per token." — recorded as `no-free-tier`, the schema's closest value (2026-09-29)                                                                                                                                   |
| Auth-failure shape        | unauthenticated `GET https://pass.wafer.ai/v1/chat/completions` returned HTTP 401 with `error.type` `authentication_error` and `error.code` `missing_api_key`, 2026-09-29 (a GET; no POST was sent) — `errorRules` match status `401`                                                          |
| Tools / structured output | roster `chat_completions` flags on the 8 models: `tools`, `tool_streaming`, `json_object`, `json_schema` and `tools_with_response_format` are `true`. These flags were not exercised with a request, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false` |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=wafer` with a real key and record the result.                                                                           |

Pages opened for this entry: https://www.wafer.ai/ai-info,
https://docs.wafer.ai/serverless,
https://docs.wafer.ai/serverless/zero-data-retention,
https://www.wafer.ai/terms and https://app.wafer.ai.

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                       | Cause                                                                                                                    | Fix                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 401 `missing_api_key`                    | Wafer's response body reads: `Missing API key. Provide credentials via Authorization: Bearer <key> or x-api-key: <key>.` | Set `WAFER_API_KEY`; NeuroLink's Tier-2 wire format sends `Authorization: Bearer`, one of the two headers Wafer's message names |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — no combined request was sent                                      | NeuroLink omits `response_format` automatically whenever tools are present, before sending                                      |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
