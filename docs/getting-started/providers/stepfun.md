---
title: StepFun Provider Guide
description: StepFun on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `step-5-preview`
keywords: stepfun, step, openai-compatible, tier 2, provider setup, step-5-preview, step-3.7-flash
---

# StepFun Provider Guide

StepFun is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/stepfun.json`) rather than hand-written code.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** StepFun's `GET https://api.stepfun.ai/v1/models` needs a key
> (it answers HTTP 401 without one), so the five model ids come from the
> vendor's public
> [pricing page](https://platform.stepfun.ai/docs/en/guides/pricing/details.md)
> and the roster has not been checked. No account was created and no API key
> was used to build this entry. `evidence.liveMatrix` is `null` until someone
> runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `stepfun`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the vendor's
  [migration page](https://platform.stepfun.ai/docs/en/guides/developer/openai.md)
  says "Stepfun models are compatible with the OpenAI API spec."
- **Base URL**: `https://api.stepfun.ai/v1`
- **Step Plan**: the vendor's
  [Step Plan overview](https://platform.stepfun.ai/docs/en/step-plan/overview.md)
  lists a separate OpenAI SDK base URL, `https://api.stepfun.ai/step_plan/v1`;
  this entry's default is the standard endpoint above
- **Default model**: `step-5-preview`
- **Models in catalog**: 5 (ids taken from the vendor's pricing page; roster
  not checked)
- **Streaming**: supported — the
  [Chat Completions page](https://platform.stepfun.ai/docs/en/api-reference/chat/chat-completion-create.md)
  documents `stream` and `chat.completion.chunk` events ending in
  `data: [DONE]`
- **Tool calling**: `model-dependent` — the
  [Tool Call page](https://platform.stepfun.ai/docs/en/api-reference/tool-call.md)
  lists `step-5-preview`, `step-3.7-flash`, `step-3.5-flash` and
  `step-3.5-flash-2603` among the models that support Toolcall requests
- **Tools while streaming**: supported — the streaming chunk format on the
  Chat Completions page includes a `tool_calls` field in `delta`
- **Structured output**: supported — the Chat Completions page documents
  `response_format` `{ "type": "json_object" }`, and the
  [JSON Mode page](https://platform.stepfun.ai/docs/en/guides/developer/json-mode.md)
  says the `json_schema` approach applies to `step-5-preview`,
  `step-3.7-flash`, `step-3.5-flash` and `step-3.5-flash-2603`
- **Structured output + tools together**: not declared (`false`) — no
  combined probe was possible without credentials
- **Embeddings**: not declared
- **Thinking**: declared (`true`) — the Chat Completions page documents a
  `reasoning_effort` request parameter and a `reasoning` response field
- **Billing**: recorded as `no-free-tier` because the catalog schema has no
  `unknown` value; that is not a vendor statement. The vendor's own billing
  wording is quoted under [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.stepfun.ai/interface-key and sign in - the Quickstart (https://platform.stepfun.ai/docs/en/quickstart/overview.md) says "Sign in to the StepFun Open Platform and create and copy an API key on the Interface Keys page."
2. Billing as the vendor states it: the pricing overview (https://platform.stepfun.ai/docs/en/guides/pricing/intro.md) says fees are deducted "drawing from free credit first, then paid balance", and the Error Codes page (https://platform.stepfun.ai/docs/en/api-reference/error-codes.md) lists HTTP 402 as "Insufficient balance" with the resolution "Add funds to your account."
3. Set `STEPFUN_API_KEY` in your .env file

### 2. Configure

```bash
export STEPFUN_API_KEY=your-api-key
export STEPFUN_MODEL=step-5-preview   # optional — overrides the default model
export STEPFUN_BASE_URL=https://api.stepfun.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "stepfun",
  model: "step-5-preview",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider stepfun
```

Per-request credentials are passed the same way as for the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "stepfun",
  credentials: { stepfun: { apiKey: process.env.STEPFUN_API_KEY } },
});
```

---

## Billing

The pricing overview
([pricing/intro](https://platform.stepfun.ai/docs/en/guides/pricing/intro.md))
says fees are deducted "drawing from free credit first, then paid balance". The
[Error Codes page](https://platform.stepfun.ai/docs/en/api-reference/error-codes.md)
lists HTTP `402` as "Insufficient balance" with the resolution "Add funds to
your account." The
[pricing details page](https://platform.stepfun.ai/docs/en/guides/pricing/details.md)
says pay-as-you-go calls to the standard Open Platform API "are rate limited by
tier according to the cumulative top-up amount on your account", and for
individual accounts states "Individual accounts must complete identity
verification first." Its individual-account tiers:

| User tier | Cumulative top-up amount | Concurrency | RPM   | TPM        |
| --------- | ------------------------ | ----------- | ----- | ---------- |
| V0        | Under $15                | 5           | 100   | 500,000    |
| V1        | $15 to $69               | 20          | 400   | 2,000,000  |
| V2        | $70 to $299              | 30          | 600   | 3,000,000  |
| V3        | $300 to $1,499           | 40          | 800   | 4,000,000  |
| V4        | $1,500 and above         | 130         | 2,600 | 13,000,000 |

The entry records `no-free-tier` because the catalog schema requires one of
`free-tier`, `free-with-card` or `no-free-tier`; the vendor pages quoted above
are the billing statement.

---

## Models

| Model                  | Context | Max output | Vision | $/M in · out (cache hit) | Notes                                                                                                                                                                    |
| ---------------------- | ------- | ---------- | ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `step-5-preview` ⭐    | 1M      | 64k        | yes    | $1.00 / $2.70 ($0.05)    | NeuroLink default. "Step 5 Preview is StepFun's flagship model for agentic work." The Chat Completions page states "The examples below use step-5-preview by default."   |
| `step-3.7-flash`       | 256K    | —          | yes    | $0.20 / $1.15 ($0.04)    | Fallback. "StepFun's flagship multimodal reasoning model."                                                                                                               |
| `step-3.5-flash`       | 256K    | —          | no     | $0.10 / $0.30 ($0.02)    | Fallback. "StepFun's flagship language reasoning model"; the Quickstart table lists Input capabilities "Text only".                                                      |
| `step-3.5-flash-2603`  | 256K    | —          | no     | $0.10 / $0.30 ($0.02)    | Fallback. "Agent-optimized version: tuned from step-3.5-flash for high-frequency agent scenarios."                                                                       |
| `step-1o-turbo-vision` | 32K     | —          | yes    | $0.36 / $1.15 ($0.07)    | Fallback. Listed under "Pricing for Vision Models"; the welcome-page card says "Designed for social content creation, AI assistants, and image and video understanding." |

Context, max output and prices are the vendor's figures from these pages
(retrieved 2026-09-29):

- `step-5-preview`: the
  [model page](https://platform.stepfun.ai/docs/en/guides/models/step-5-preview.md)
  gives Context window "1M tokens", Input types "Text, images, and video" and
  Maximum output "64k tokens".
- `step-3.7-flash`: the
  [model page](https://platform.stepfun.ai/docs/en/guides/models/step-3.7-flash.md)
  states a context length of 256K tokens; the
  [Quickstart table](https://platform.stepfun.ai/docs/en/quickstart/overview.md)
  lists Input capabilities "Text, images, and video".
- `step-3.5-flash`: the
  [model page](https://platform.stepfun.ai/docs/en/guides/models/step-3.5-flash.md)
  states a context length of 256K tokens.
- `step-3.5-flash-2603`: the same model page describes it under Model variants;
  the [welcome page](https://platform.stepfun.ai/docs/en/welcome.md) card titled
  "Step 3.5 Flash 2603" shows the metric "Max context" (value 256K).
- `step-1o-turbo-vision`: the welcome-page card titled "Step-1o Turbo Vision"
  shows the metric "Max context" (value 32K); the
  [Model Retirement and Migration page](https://platform.stepfun.ai/docs/en/guides/model-migration.md)
  lists it in the "Recommended replacement" column for step-1-8k, step-1-32k,
  step-1v-8k, step-1v-32k, step-2-mini, step-1o-vision-32k and step-2-16k.
- Prices for the five models: the
  [pricing details page](https://platform.stepfun.ai/docs/en/guides/pricing/details.md)
  (per 1M tokens, input cache miss / input cache hit / output).

The catalog stores the labels as decimal numbers (`1M` as 1,000,000, `256K` as
256,000, `32K` as 32,000, `64k` as 64,000). `models.defaultContextWindow`
(32,000) and `models.defaultMaxOutputTokens` (16,384) are conservative
placeholders for model ids outside the catalog; the vendor does not publish a
general default.

**Vision:** `vision: true` for `step-5-preview` and `step-3.7-flash` follows the
Input capabilities "Text, images, and video" in the Quickstart table, and for
`step-1o-turbo-vision` follows its "Pricing for Vision Models" listing and card
text. `step-3.5-flash` and `step-3.5-flash-2603` are `vision: false`; the
welcome-page card for `step-3.5-flash-2603` carries the category "Reasoning /
text".

**Status:** `step-5-preview` is marked `preview` because the vendor names it
"Step 5 Preview".

**Fallback order** when the default is unavailable:
`step-3.7-flash` → `step-3.5-flash` → `step-3.5-flash-2603` →
`step-1o-turbo-vision`. `models.fallbackModelName` is set to `step-3.7-flash`,
which the Quickstart table lists with the same Input capabilities ("Text,
images, and video") as the default. `models.visionModel` is `step-5-preview`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for StepFun — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models` answers HTTP 401 without a key (2026-09-29), so the roster has not been checked; model ids come from the vendor's pricing page (retrieved 2026-09-29)                                                                                                                                                                          |
| Billing                   | vendor wording quoted under [Billing](#billing): "drawing from free credit first, then paid balance"; HTTP 402 "Insufficient balance"; tiered rate limits by cumulative top-up amount, 2026-09-29                                                                                                                                                               |
| Auth-failure shape        | unauthenticated `GET /v1/models` and `GET /v1/chat/completions` each answered HTTP 401 with the body `{"error":{"message":"Incorrect API key provided","type":"invalid_api_key"}}` on 2026-09-29 (the body has no `error.code` field; `authProbe.code` records `error.type`). `errorRules` match 401 plus 402, 429, 451 and 503 from the Error Codes page       |
| Tools / structured output | documented on the Tool Call and JSON Mode pages; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`. No POST request was sent, so the request fields NeuroLink's client can add (`stream_options`, `tool_choice`, a `json_schema` `response_format`) have not been exercised against StepFun |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=stepfun` with a real key and record the result.                                                                                                                                          |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

These rows restate the vendor's
[Error Codes page](https://platform.stepfun.ai/docs/en/api-reference/error-codes.md)
(retrieved 2026-09-29).

| Symptom  | Cause (vendor wording)                                                       | Fix (vendor wording)                                |
| -------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| HTTP 400 | "Request parameters are invalid."                                            | "Check the docs and pass the parameters correctly." |
| HTTP 401 | "Invalid authentication"                                                     | "Make sure you are using the correct API key."      |
| HTTP 402 | "Insufficient balance"                                                       | "Add funds to your account."                        |
| HTTP 404 | "Incorrect request path"                                                     | "Update the request path per the docs."             |
| HTTP 429 | "Resource or rate limit exceeded, usually because requests are too frequent" | "Retry after a short delay."                        |
| HTTP 451 | "The request or response content failed review"                              | "Modify the request and try again."                 |
| HTTP 500 | "Server-side issue on our end"                                               | "Retry shortly; contact us if it persists."         |
| HTTP 503 | "Server is currently overloaded"                                             | "Retry after a short delay."                        |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
