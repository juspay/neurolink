---
title: Sakana AI Provider Guide
description: Sakana AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `fugu`
keywords: sakana, sakana-ai, fugu, sakana-namazu, openai-compatible, tier 2, provider setup
---

# Sakana AI Provider Guide

Sakana AI is a **Tier-2 catalog provider**: it is expressed as OpenAI-wire-compatible
with no quirks block, so its entire integration is one JSON file
(`src/lib/providers/catalog/sakana-ai.json`) rather than hand-written code.
That file is the source of truth for the facts on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET https://api.sakana.ai/v1/models` needs a
> key (it answers HTTP 401 without one), so the model ids come from Sakana AI's
> public Models page and the roster has not been checked. No account was created
> and no API key was used to build it. `evidence.liveMatrix` is `null` until
> someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `sakana-ai` (alias `sakana`)
- **Protocol**: OpenAI-compatible (`/chat/completions`). The Models page
  ([console.sakana.ai/models](https://console.sakana.ai/models)) also lists
  Responses, Models and Anthropic-compatible Messages endpoints and says: "For
  generation requests, we strongly recommend using the Responses API, for better
  performance." This entry sends `/chat/completions`, which the same page
  documents with the line "Use /v1/chat/completions when you want the OpenAI
  Chat Completions API shape."
- **Base URL**: `https://api.sakana.ai/v1` (the Get Started page,
  [console.sakana.ai/get-started](https://console.sakana.ai/get-started), shows
  the OpenAI Python SDK with `base_url = "https://api.sakana.ai/v1"`)
- **Default model**: `fugu`
- **Models in catalog**: 9, copied from the Supported models table on the Models
  page. The table's other two ids, `fugu-cyber` and `fugu-cyber-v1.0`, are left
  out of the catalog: the page says "In order to use Fugu Cyber, users must
  submit an access request form detailing their intended use case and providing
  verified contact information."
- **Streaming**: supported — the Chat Completions field table lists `stream`
  ("Stream the response."), and the Sakana Namazu tab lists Streaming as
  "Supported"
- **Tool calling**: `model-dependent` — the Chat Completions field tables list
  `tools` ("Tool definitions the model may call.") and `tool_choice` for Fugu,
  and `tools` ("Function tool definitions or built-in tools") for Sakana Namazu;
  not exercised with a key
- **Tools while streaming**: not declared (`false`) — no page documents tools
  and streaming together
- **Structured output**: supported — the Fugu Chat Completions table lists
  `response_format` ("Structured output with text, json_object, or
  json_schema."), and the Sakana Namazu tab lists "json_schema and json_object"
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared
- **Thinking**: declared — the Fugu Chat Completions table lists
  `reasoning_effort` with an effort value of `high`, `xhigh` or `max`, and the
  Sakana Namazu tab says "Sakana Namazu supports extended thinking". Neither was
  exercised through NeuroLink
- **Billing**: catalog value `no-free-tier`. The Pricing page
  ([console.sakana.ai/pricing](https://console.sakana.ai/pricing)) lists Pay as
  you go rates per model and three Subscription Plans (Standard $20/month, Pro
  $100/month, Max $200/month)
- **Key format**: none declared. The Get Started page's Claude Code example
  writes the key as `"fish_..."` with the comment `# your Sakana key`; NeuroLink
  does not validate a prefix

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.sakana.ai/overview and sign in - the page shows "Login with Google" and "Send login link"
2. Create an API key - the Get Started page (https://console.sakana.ai/get-started) says: "Before using Fugu or Sakana Namazu, create an API key and copy the generated key. The key is shown only once, so store it somewhere secure before closing the dialog."
3. Billing as the vendor states it: the Pricing page (https://console.sakana.ai/pricing) lists Pay as you go rates per model and Subscription Plans (Standard $20/month, Pro $100/month, Max $200/month); the Get Started page says Sakana Namazu "is billed purely on a pay-as-you-go (per-token) basis."
4. Set `SAKANA_AI_API_KEY` in your .env file (`SAKANA_API_KEY`, which the Get Started page's curl example reads, is accepted as a fallback; the Models page's Python example reads `FUGU_API_KEY` and `FUGU_BASE_URL`, which NeuroLink does not)

### 2. Configure

```bash
export SAKANA_AI_API_KEY=your-api-key
export SAKANA_AI_MODEL=fugu   # optional — overrides the default model
export SAKANA_AI_BASE_URL=https://api.sakana.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "sakana-ai",
  model: "fugu",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider sakana-ai
```

Per-request credentials work as they do for other providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "sakana-ai",
  credentials: { sakanaAi: { apiKey: process.env.SAKANA_AI_API_KEY } },
});
```

---

## Models

| Model                | Context | Vision | $/M in · out (cached) | Notes                                                                                                           |
| -------------------- | ------- | ------ | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `fugu` ⭐            | 1M      | yes    | not recorded          | NeuroLink default. Models page: "The default Fugu model." Fugu overview: "the ideal default for everyday work." |
| `fugu-ultra`         | 1M      | yes    | $5 / $30 ($0.50)      | Models page: "The Fugu Ultra model, defaults to fugu-ultra-v2.0." Priced as `fugu-ultra-v2.0`.                  |
| `fugu-ultra-v2.0`    | 1M      | yes    | $5 / $30 ($0.50)      | Models page: "V2.0 of Fugu Ultra." Pricing page: "Fixed pricing for fugu-ultra-v2.0 per 1M tokens."             |
| `fugu-ultra-v1.1`    | 1M      | yes    | not recorded          | Models page: "V1.1 of Fugu Ultra."                                                                              |
| `fugu-ultra-v1.0`    | 1M      | yes    | not recorded          | Models page: "V1.0 of Fugu Ultra, also known as fugu-ultra-20260615."                                           |
| `fugu-max`           | 1M      | yes    | $2 / $6 ($0.25)       | Models page: "The Fugu Max model, defaults to fugu-max-v1.0." Priced as `fugu-max-v1.0`.                        |
| `fugu-max-v1.0`      | 1M      | yes    | $2 / $6 ($0.25)       | Models page: "V1.0 of Fugu Max, optimized for cost-performance." Pricing page: "regardless of context length."  |
| `sakana-namazu`      | 256K    | yes    | $0.95 / $4.00 ($0.15) | Models page: "Alias that points to the latest version (currently sakana-namazu-v1.0)."                          |
| `sakana-namazu-v1.0` | 256K    | yes    | $0.95 / $4.00 ($0.15) | Models page: "V1.0 of the Sakana Namazu model. A Japanese-specialized LLM."                                     |

**Sources.** Model ids come from the Supported models table on
[console.sakana.ai/models](https://console.sakana.ai/models) (retrieved
2026-09-29); the Sakana Namazu property table is on the tab at
[console.sakana.ai/models?model=sakana-namazu](https://console.sakana.ai/models?model=sakana-namazu).
Prices come from [console.sakana.ai/pricing](https://console.sakana.ai/pricing):
`fugu-ultra-v2.0` Standard price column $5 input, $30 output, $0.50 cached input
(the Context > 272K column reads $10, $45 and $1.00), `fugu-max-v1.0` $2 input,
$6 output, $0.25 cached input, and `sakana-namazu-v1.0` $0.95 input, $4.00 output,
$0.15 cached input. The Pricing page's Fugu table says, for one agent, "You pay
only the standard rate for the specific underlying model." and, for multiple
agents, "We never stack model fees. You are charged a single rate based on the
top tier model involved." No price is recorded for `fugu`, `fugu-ultra-v1.1` or
`fugu-ultra-v1.0`.

**Context and vision.** The Get Started page's Codex model catalog snippet lists
`context_window` 1000000 and `input_modalities` text and image for the slugs
`fugu`, `fugu-ultra` (display name "Fugu Ultra v2.0"), `fugu-max`,
`fugu-ultra-v1.1` and `fugu-ultra-v1.0`. `fugu-ultra-v2.0` and `fugu-max-v1.0`
take the same values as the slugs that the Models page says default to them.
The Sakana Namazu tab lists Context window "256K tokens" (stored as 256000) and
Image input "Supported (URL and base64)".

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(8,192) are conservative placeholders the vendor does not publish.

**Fallback order** when the default is unavailable: `fugu-ultra` → `fugu-max` →
`sakana-namazu`. The runtime fallback model name the loader derives
(`fallbacks[1]`) is `fugu-max`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Sakana AI — **docs-verified only, not yet
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://api.sakana.ai/v1/models` answers HTTP 401 without a key, 2026-09-29 — model ids are taken from https://console.sakana.ai/models; the roster has not been checked                                                                                                                                                                                            |
| Auth-failure shape        | unauthenticated `GET /v1/models` returned HTTP 401 with JSON body `{"error":{"message":"Missing API key","type":"authentication_error","param":null,"code":null}}`, 2026-09-29; `errorRules` holds one rule, for status 401, and `evidence.authProbe.code` records the body's `error.type` because `error.code` is null. An unauthenticated `GET /v1/chat/completions` answered HTTP 405 |
| Billing                   | the Pricing page lists Pay as you go rates and Subscription Plans at $20/month, $100/month and $200/month; the Get Started page says Sakana Namazu "is billed purely on a pay-as-you-go (per-token) basis", 2026-09-29 — no sign-up performed                                                                                                                                            |
| Tools / structured output | documented in the Chat Completions field tables on the Models page; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                                |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=sakana-ai` with a real key and record the result.                                                                                                                                                                 |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row below is a statement from a Sakana AI page or the observed response
body; NeuroLink has not exercised them with a key.

| Symptom                                         | What the vendor page or response says                                                                                                                                                 | Source                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| HTTP 401 with `error.message` "Missing API key" | Body returned by an unauthenticated `GET https://api.sakana.ai/v1/models` on 2026-09-29; the Get Started page's curl example sends the header `Authorization: Bearer $SAKANA_API_KEY` | api.sakana.ai response; Get Started page |
| Client-side timeouts with `fugu-ultra`          | "For complex tasks, especially when using fugu-ultra and fugu-cyber, you may need to increase client-side timeouts."                                                                  | Get Started page                         |
| `sakana-namazu` requests and a subscription     | "Sakana Namazu is not included in subscription plans — it is billed purely on a pay-as-you-go (per-token) basis."                                                                     | Get Started page                         |
| A `fugu-cyber` id is needed                     | "In order to use Fugu Cyber, users must submit an access request form detailing their intended use case and providing verified contact information."                                  | Models page                              |
| Sampling fields have no effect                  | The Fugu Chat Completions table lists `temperature`, `top_p`, `stop`, `seed`, `frequency_penalty` and `presence_penalty` as "Accepted but ignored."                                   | Models page                              |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
