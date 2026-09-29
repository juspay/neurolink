---
title: Reka AI Provider Guide
description: Reka AI on NeuroLink — Tier-2 catalog provider, default model `reka-flash`
keywords: reka, reka-ai, tier 2, provider setup, reka-flash, reka-edge
---

# Reka AI Provider Guide

Reka AI is a **Tier-2 catalog provider**: its entire integration is one JSON
file (`src/lib/providers/catalog/reka.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** Reka's `GET https://api.reka.ai/v1/models` needs a key (it
> answers HTTP 401 without one), so the three model ids come from Reka's public
> docs ([Models page](https://docs.reka.ai/chat/models.md), retrieved
> 2026-09-29) and the roster has not been checked. No account was created, no
> API key was used and no POST request was sent to build it.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `reka`
- **Endpoint**: `/chat/completions` — the
  [Quickstart](https://docs.reka.ai/quickstart.md) says "our API is fully
  OpenAI-compatible"
- **Base URL**: `https://api.reka.ai/v1`
- **Default model**: `reka-flash`
- **Models in catalog**: 3 — the ids on the Models page (`reka-flash`,
  `reka-edge`, `reka-edge-2603`)
- **Streaming**: supported — the
  [Chat overview](https://docs.reka.ai/chat/overview.md) says "The Chat API
  supports streaming"
- **Tool calling**: `model-dependent` — the
  [Function Calling page](https://docs.reka.ai/chat/function-calling.md)
  documents the `tools` parameter and `tool_calls`, and says "Currently, only
  Reka Flash supports function calling."
- **Tools while streaming**: not declared (`false`) — no request combining them
  was sent
- **Structured output**: not declared (`false`) — the ChatRequest on the
  [Chat API reference](https://docs.reka.ai/chat/api-reference/create.md) lists
  `messages`, `model`, `frequency_penalty`, `max_tokens`, `presence_penalty`,
  `seed`, `stop`, `stream`, `temperature`, `tool_choice`, `tools`, `top_k` and
  `top_p`
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared
- **Thinking**: not declared
- **Vision**: `reka-flash`, `reka-edge` and `reka-edge-2603` are marked
  `vision: true` from the vendor's image examples (see [Models](#models))
- **Billing**: `billingPolicy` holds `free-tier`, one of the three values the
  catalog schema allows — the vendor wording is quoted in
  [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.reka.ai/sign-up (the "Start for free" and "Get started" links on https://platform.reka.ai/pricing point to /sign-up). The Quickstart (https://docs.reka.ai/quickstart.md) says "Create a free account on the Reka Platform to access your API key." and the FAQ (https://docs.reka.ai/resources/faqs.md) answers "How do I get an API key?" with "Go to Platform, > API Keys to generate or copy your key."
2. Billing as the vendor states it: https://docs.reka.ai/pricing.md says "Get started with no upfront costs."; the FAQ (https://docs.reka.ai/resources/faqs.md) answers "Do I need to pre-pay?" with "Yes. Add credits to your account before making requests." and says the balance error reads "P001: Insufficient Balance" when the balance hits $0
3. Authentication: the vendor's REST examples send the header X-Api-Key (https://docs.reka.ai/chat/overview.md) and the OpenAPI file https://docs.reka.ai/openapi/api-reference.yaml declares one security scheme, an apiKey in the header X-Api-Key; the OpenAI Python SDK examples pass api_key="YOUR_API_KEY" to the client (https://docs.reka.ai/quickstart.md)
4. Set `REKA_API_KEY` in your .env file

### 2. Configure

```bash
export REKA_API_KEY=your-api-key
export REKA_MODEL=reka-flash   # optional — overrides the default model
export REKA_BASE_URL=https://api.reka.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "reka",
  model: "reka-flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider reka
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "reka",
  credentials: { reka: { apiKey: process.env.REKA_API_KEY } },
});
```

---

## Billing

What the vendor's pages say, as opened on 2026-09-29:

- The Quickstart (https://docs.reka.ai/quickstart.md): "Create a free account on
  the Reka Platform to access your API key."
- The FAQ (https://docs.reka.ai/resources/faqs.md), "Do I need to pre-pay?":
  "Yes. Add credits to your account before making requests." It adds that when
  the balance hits $0 the error reads "P001: Insufficient Balance".
- The API pricing page (https://docs.reka.ai/pricing.md) has a "Pay as you go"
  heading and says "Get started with no upfront costs. You only pay for what you
  use."
- The platform pricing page (https://platform.reka.ai/pricing) shows a "Pay as
  you go" tile with the text "Add credits only when you need them." and a "Start
  for free" link to /sign-up; the page also carries the text "Free credits used".

`billingPolicy` holds `free-tier`, one of the three values the catalog schema
allows (`free-tier`, `free-with-card`, `no-free-tier`).

---

## Models

| Model            | Context | Vision | $/M in · out  | Notes                                                                                                                                                                                                         |
| ---------------- | ------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reka-flash` ⭐  | —       | yes    | $0.80 / $2.00 | NeuroLink default. Named in the code examples of the Chat overview, Function Calling and Chat API reference pages; the pricing page describes "Reka Flash" as "Fast and cost-efficient model for most tasks". |
| `reka-edge`      | —       | yes    | $0.10 / $0.10 | Listed as "reka-edge (or reka-edge-2603)" on the Models page and the Quickstart; the pricing page describes "Reka Edge" as "Compact model ideal for on-device execution". Fallback.                           |
| `reka-edge-2603` | —       | yes    | $0.10 / $0.10 | Named in the same table row as `reka-edge`; the Models page shows it in the example output of `GET /v1/models`. Vision and prices are those of the `reka-edge` row.                                           |

Model ids come from https://docs.reka.ai/chat/models.md, which says "Our baseline
models always available for public access are:" and lists `reka-flash` and
`reka-edge (or reka-edge-2603)`. Prices come from https://docs.reka.ai/pricing.md
("Input Tokens (per 1M)" and "Output Tokens (per 1M)" columns, rows named "Reka
Flash" and "Reka Edge"); the Models page says "For full listing of models and
pricing, see the Reka API Pricing page".

**Vision:** the first curl example on https://docs.reka.ai/overview.md sends an
`image_url` content part to `reka-flash`, and the Quickstart's "First request"
example (https://docs.reka.ai/quickstart.md) sends an `image_url` content part to
`reka-edge` with the comment `# or "reka-flash"`. The
[Chat with Image, Video, and Audio page](https://docs.reka.ai/chat/chat-with-image-video-and-audio.md)
says "The supported types are: `image_url`, `video_url`, `audio_url`, and
`pdf_url`."

**Context and output limits:** no per-model figure is set, so a Context cell
shows "—". `models.defaultContextWindow` (16,384) and
`models.defaultMaxOutputTokens` (4,096) are placeholders the vendor does not
publish. The Chat API reference describes `max_tokens` as "limited by the
model's context length. Defaults to 1024."

**Status:** each model's `status` field in the JSON holds `production`, a
placeholder for a value the catalog schema requires; it is not a vendor
statement.

**Fallback order** when the default is unavailable: `reka-edge`. The runtime
fallback model name the loader derives (`fallbacks[0]`) is also `reka-edge`.

**Other Reka models:** the Models page says "Other models may be available." and
that the Get Models API "allows you to list what models you have available to
you." The pricing page also has a row named "Reka Core".

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Reka AI — **docs-verified only, not live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                    | unauthenticated `GET /v1/models` answered HTTP 401 on 2026-09-29, so the model ids come from https://docs.reka.ai/chat/models.md; **roster not verified**                                                                                                                                                                      |
| Auth-failure shape        | the same GET returned the JSON body `{"error":{"message":"Unauthorized","type":"authentication_error","code":null,"param":null}}`; `evidence.authProbe` records status 401 and code `authentication_error` (the body's `error.type`, because `error.code` is null). `errorRules` match 401, 429, 500 and the FAQ's `P001` text |
| Chat endpoint             | an unauthenticated `GET /v1/chat/completions` answered HTTP 405 with header `allow: POST` and body `{"detail":"Method Not Allowed"}`; no POST request was sent                                                                                                                                                                 |
| Billing                   | https://docs.reka.ai/pricing.md says "Get started with no upfront costs."; the FAQ answers "Do I need to pre-pay?" with "Yes. Add credits to your account before making requests."; https://platform.reka.ai/pricing has a "Start for free" link and the text "Free credits used"; no signup was performed                     |
| Sign-up page              | on 2026-09-29 an unauthenticated GET of https://platform.reka.ai/ answered HTTP 404, while GET https://platform.reka.ai/sign-up and https://platform.reka.ai/pricing answered HTTP 200; `setup.url` is the sign-up page                                                                                                        |
| Auth header               | the vendor's REST examples and OpenAPI file use `X-Api-Key`; the OpenAI Python SDK examples pass `api_key=` to the client. NeuroLink's Tier-2 client uses Bearer authentication, and no authenticated request could be made to exercise it                                                                                     |
| Tools / structured output | function calling is documented on https://docs.reka.ai/chat/function-calling.md; neither tools nor structured output was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                             |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. The command is `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=reka`, which needs a real key.                                                                                                                                                                  |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row is the Error Type and Client Action columns of the table on https://docs.reka.ai/errors.md.

| Symptom  | Vendor statement       | Vendor's client action                                                                         |
| -------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| HTTP 401 | `authentication_error` | "Ensure that you're using a valid Reka API key"                                                |
| HTTP 429 | `rate_limit_error`     | "Wait until your rate limit is restored and retry, or upgrade your API tier for higher limits" |
| HTTP 500 | `server_error`         | "Retry with backoff. If this persists, contact Reka at contact@reka.ai"                        |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
