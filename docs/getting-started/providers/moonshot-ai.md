---
title: Moonshot AI (Kimi) Provider Guide
description: Moonshot AI (Kimi API) on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `kimi-k3`
keywords: moonshot, moonshot-ai, kimi, kimi-k3, openai-compatible, tier 2, provider setup
---

# Moonshot AI (Kimi) Provider Guide

Moonshot AI's Kimi API is a **Tier-2 catalog provider**: OpenAI-wire-compatible,
so its integration is one JSON file (`src/lib/providers/catalog/moonshot-ai.json`)
rather than hand-written code. That file is the source of truth for everything
on this page. The one behavioural setting it carries is the
`replayReasoningContent` quirk, explained under [Key Facts](#key-facts).

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET /v1/models` needs a key (an unauthenticated
> GET answers HTTP 401), so the model ids come from the vendor's public docs at
> https://platform.kimi.ai/docs/models and the roster has not been checked.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below). No
> account was created and no API key was used to build this entry.

---

## Key Facts

- **Provider id**: `moonshot-ai` (aliases `moonshot`, `kimi`)
- **Protocol**: OpenAI-compatible (`/chat/completions`). The
  [Quickstart](https://platform.kimi.ai/docs/overview) says: "Kimi API lets you
  interact with Kimi models and is compatible with both the OpenAI and Anthropic
  API formats."
- **Base URL**: `https://api.moonshot.ai/v1`. The docs and console live on
  `platform.kimi.ai` and call the product the Kimi API; the API host is
  `api.moonshot.ai`.
- **Default model**: `kimi-k3`
- **Models in catalog**: 4 — the models the
  [Model List](https://platform.kimi.ai/docs/models) names under "Multi-modal
  Model". The chat request schema in the vendor's
  [OpenAPI file](https://platform.kimi.ai/docs/openapi.json) names the same four
  ids.
- **Streaming**: supported. The
  [streaming guide](https://platform.kimi.ai/docs/guide/utilize-the-streaming-output-feature-of-kimi-api)
  documents `stream` responses as `Content-Type: text/event-stream` (SSE) ending
  with `data: [DONE]`.
- **Tool calling**: `true` — the
  [tool-calls guide](https://platform.kimi.ai/docs/guide/use-kimi-api-to-complete-tool-calls)
  documents the `tools` parameter and `tool_calls` (including tool calls in
  streaming output), and the
  [Kimi K3](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart),
  [Kimi K2.7 Code](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart)
  and [Kimi K2.6](https://platform.kimi.ai/docs/guide/kimi-k2-6-quickstart)
  pages describe tool calling for their models. The
  [parameter reference](https://platform.kimi.ai/docs/api/models-overview) says
  `kimi-k3` supports `tool_choice` values `auto` / `none` / `required`, while
  `kimi-k2.6` and `kimi-k2.7-code` "return an error if it is passed" for
  `required`.
- **Tools while streaming**: `true`, per the tool-calls guide section "Handle
  tool_calls in Streaming Output"
- **Structured output**: supported — `response_format` accepts `json_object` and
  `json_schema`
  ([response_format guide](https://platform.kimi.ai/docs/guide/response_format)).
  For `kimi-k2.6` the same guide states: "kimi-k2.6 occasionally behaves
  unstably with complex schemas; for example, $ref may return a Markdown code
  block, oneOf may be ignored, and partial=true may output fields outside the
  schema."
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared
- **Thinking**: not declared (`false`) on this entry. The vendor's
  [Thinking Models](https://platform.kimi.ai/docs/guide/use-thinking-models)
  page documents `reasoning_content`, `reasoning_effort` for `kimi-k3` and the
  `thinking` parameter for `kimi-k2.6`; the generic catalog provider does not
  send `reasoning_effort` or `thinking`, so NeuroLink's `thinkingLevel` is not
  mapped to them.
- **Reasoning replay (`quirks.replayReasoningContent: true`)**: the Thinking
  Models page says "For K3, this is required in multi-turn conversations and
  tool-call loops", and that for `kimi-k2.7-code` "you must therefore (not
  optionally) keep the `reasoning_content` of historical assistant messages in
  `messages` as-is". The quirk sends the assistant turns' `reasoning_content`
  back on later requests. It has not been exercised against the live API.
- **Billing**: `no-free-tier` — see [Billing](#billing) below
- **Key format**: not declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.kimi.ai/console/api-keys and sign in, then create and copy an API key (https://platform.kimi.ai/docs/overview describes signing in to the Kimi API Platform and creating a key under API Keys)
2. Create the key on platform.kimi.ai: the errors page states that keys issued on platform.kimi.ai are independent from keys issued on other regional Kimi platforms, and that "Mixing keys across platforms returns 401." (https://platform.kimi.ai/docs/api/errors)
3. Top up before use: "To prevent abuse, you need to recharge at least $1 to start using, and when your cumulative recharge reaches $5, you will receive a $5 voucher." (https://platform.kimi.ai/docs/pricing/limits); the Kimi K3 page states "Kimi K3 is a flagship model: it is unlocked after a successful top-up (minimum $1)." (https://platform.kimi.ai/docs/guide/kimi-k3-quickstart)
4. Set `MOONSHOT_AI_API_KEY` in your .env file (`MOONSHOT_API_KEY`, the variable Kimi's own docs use, is also read)

### 2. Configure

```bash
export MOONSHOT_AI_API_KEY=your-api-key
export MOONSHOT_AI_MODEL=kimi-k3   # optional — overrides the default model
export MOONSHOT_AI_BASE_URL=https://api.moonshot.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "moonshot-ai",
  model: "kimi-k3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider moonshot-ai
```

Per-request credentials work as they do for the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "moonshot-ai",
  credentials: { moonshotAi: { apiKey: process.env.MOONSHOT_AI_API_KEY } },
});
```

---

## Billing

The [Recharge and Rate Limiting](https://platform.kimi.ai/docs/pricing/limits)
page says: "To prevent abuse, you need to recharge at least $1 to start using,
and when your cumulative recharge reaches $5, you will receive a $5 voucher." The
[Compare with Other Kimi Products](https://platform.kimi.ai/docs/guide/product-plans)
page describes the Kimi API Open Platform as "pay-as-you-go billing with no
subscription plan"; the Troubleshooting page repeats "pay-as-you-go with no
subscription plan". The entry records `no-free-tier`.

The
[Troubleshooting](https://platform.kimi.ai/docs/guide/troubleshooting) page also
answers "Can I try the models before topping up?" with "You can run a minimal
test in the Playground to confirm whether a model and prompt fit your scenario".

The limits page lists rate limits by cumulative recharge amount. Tier0
(cumulative recharge $1) is listed as concurrency 1, RPM 3, TPM 500,000 and TPD
1,500,000.

---

## Models

| Model                      | Context   | Vision | $/M in · out (cached)         | Notes                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | --------- | ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kimi-k3` ⭐               | 1,048,576 | yes    | $3.00 / $15.00 (cached $0.30) | NeuroLink default. Model List: "Kimi's most capable model to date". Cache write $3.00 (TTL 5min) or $6.00 (TTL 1h). "K3 always has thinking mode enabled".                                                                                                                                                                                                                                        |
| `kimi-k2.7-code`           | 262,144   | yes    | $0.95 / $4.00 (cached $0.19)  | Fallback. Model List: "Kimi's dedicated coding model." "Kimi K2.7 Code does not support non-thinking mode."                                                                                                                                                                                                                                                                                       |
| `kimi-k2.7-code-highspeed` | 262,144   | yes    | $1.90 / $8.00 (cached $0.38)  | Fallback. Model List: "High-Speed version of Kimi K2.7 Code model, with output speed of approximately 180 Tokens/s and up to 260 Tokens/s in short context scenarios". "the same model as Kimi K2.7 Code". Same page: "(Currently, the resource is limited, and the experience of the high-speed model may be slightly fluctuate，we are gradually increasing the resource.)"                     |
| `kimi-k2.6`                | 262,144   | yes    | $0.95 / $4.00 (cached $0.16)  | Fallback. Model List: "Supports both visual and text input, thinking and non-thinking modes, and dialogue and Agent tasks." "thinking is on by default, can be disabled". response_format guide: "kimi-k2.6 occasionally behaves unstably with complex schemas; for example, $ref may return a Markdown code block, oneOf may be ignored, and partial=true may output fields outside the schema." |

Context windows and prices come from the
[pricing page](https://platform.kimi.ai/docs/pricing/chat), retrieved
2026-09-29. Its K3 table columns are "Cached Input Price", "Input Price" and
"Output Price"; its K2 table columns are "Input Price (Cache Hit)", "Input Price
(Cache Miss)" and "Output Price". The catalog records the cache-hit price as
`cachedInput` and the cache-miss price as `input`. Prices are per 1M tokens and
"exclude applicable taxes".

`vision: true` for the four models comes from the
[vision guide](https://platform.kimi.ai/docs/guide/use-kimi-vision-model), which
names `kimi-k3`, `kimi-k2.6`, `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` in
its description of the Kimi Vision Model. It also states that for K3 "Vision
input does not support public image URLs. Use base64 or `ms://<file-id>`"
([Kimi K3 page](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart)).

Output limits stated by the vendor: for `kimi-k3`, `max_completion_tokens`
"defaults to 131072 and can be set up to 1048576" ([Kimi K3
page](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart)); the
[Troubleshooting](https://platform.kimi.ai/docs/guide/troubleshooting) page gives
"the maximum output length is `1024*1024 - prompt_tokens`" for `kimi-k3` and
"the maximum output length is `256*1024 - prompt_tokens`" for `kimi-k2.7-code`
and `kimi-k2.6`. No per-model `maxOutputTokens` is recorded in the catalog.

`models.defaultContextWindow` (262,144) and `models.defaultMaxOutputTokens`
(131,072) apply to model ids outside the catalog and are placeholders: 262,144 is
the context window the pricing page lists for `kimi-k2.7-code`,
`kimi-k2.7-code-highspeed` and `kimi-k2.6`, and 131,072 is the
`max_completion_tokens` default the vendor states for `kimi-k3`. The vendor
publishes no figure for such ids.

The Model List's Deprecated Models section names `kimi-k2.5`, the `moonshot-v1`
series, the `kimi-k2` series, `kimi-latest` and `kimi-thinking-preview`; they are
not in the catalog.

**Fixed sampling parameters:** the
[parameter reference](https://platform.kimi.ai/docs/api/models-overview) lists
`temperature`, `top_p`, `n`, `presence_penalty` and `frequency_penalty` as
"Cannot be modified" for `kimi-k3`, `kimi-k2.7-code` and `kimi-k2.6`, and states
that "Fixed" means "the parameter cannot be modified: passing any other value
returns an error, so do not pass it explicitly."

**Fallback order** when the default is unavailable:
`kimi-k2.7-code` → `kimi-k2.6` → `kimi-k2.7-code-highspeed`. The order is the
catalog's own choice. The runtime fallback model name the loader derives
(`fallbacks[1]`) is `kimi-k2.6`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Moonshot AI — **docs-verified only, not live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://api.moonshot.ai/v1/models` answered HTTP 401 on 2026-09-29, so the roster was not read; the four model ids come from https://platform.kimi.ai/docs/models (retrieved 2026-09-29) and match the chat request schema in https://platform.kimi.ai/docs/openapi.json                                 |
| Auth-failure shape        | the same unauthenticated GET returned HTTP 401 with body `{"error":{"message":"Incorrect API key provided","type":"incorrect_api_key_error"}}` (no `error.code` field); the [errors page](https://platform.kimi.ai/docs/api/errors) lists `incorrect_api_key_error` — "Incorrect API key provided" under 401. No key was used |
| Billing                   | the [limits page](https://platform.kimi.ai/docs/pricing/limits) says "you need to recharge at least $1 to start using" — see [Billing](#billing), 2026-09-29                                                                                                                                                                  |
| Tools / structured output | documented on the tool-calls and response_format guides linked above; the tool-calling and structured-output paths were not exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                         |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=moonshot-ai` with a real key and record the result.                                                                                                    |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

The rows restate what the vendor's
[errors page](https://platform.kimi.ai/docs/api/errors) or
[Troubleshooting](https://platform.kimi.ai/docs/guide/troubleshooting) page says.

| Symptom                                             | Cause (vendor wording)                                                                               | Fix (vendor wording)                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| HTTP 401 `incorrect_api_key_error`                  | "The API key was not provided, or the key is incorrect."                                             | "Make sure the endpoint matches the platform where the key was created."                      |
| HTTP 404 `resource_not_found_error`                 | "Model not found, or this account does not have permission to access the model"                      | "Check the spelling of the `model` parameter and the account tier."                           |
| HTTP 429 `engine_overloaded_error`                  | "The service node is under high load (for example, peak-hour capacity pressure)."                    | "Wait as indicated by `Retry-After`, reduce concurrency, and retry with exponential backoff." |
| HTTP 429 `rate_limit_reached_error`                 | "an organization-level concurrency, RPM, TPM, or TPD limit was reached"                              | "Reduce request frequency, or see Top-up and Rate Limits to upgrade your tier"                |
| HTTP 429 `exceeded_current_quota_error`             | "insufficient balance, an overdue account, or an expired voucher"                                    | "Check `available_balance` with the balance API and top up."                                  |
| HTTP 504 on a long non-streaming request            | "No response from the server for 900 seconds; the gateway returns an HTML timeout page."             | "Use streaming output (`stream: true`)."                                                      |
| `finish_reason` is `length`                         | "the number of tokens generated by the current model exceeded the `max_completion_tokens` parameter" | "we recommend increasing `max_completion_tokens` appropriately"                               |
| Error after passing `temperature` or `top_p`        | "passing any other value returns an error"                                                           | "do not pass it explicitly"                                                                   |
| Error after passing `tool_choice: required` to K2.x | "These models do not support `required` and return an error if it is passed"                         | "only `kimi-k3` supports it"                                                                  |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
