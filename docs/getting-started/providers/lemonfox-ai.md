---
title: Lemonfox AI Provider Guide
description: Lemonfox AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek-v4-flash`
keywords: lemonfox, lemonfox-ai, openai-compatible, tier 2, provider setup, deepseek, mimo
---

# Lemonfox AI Provider Guide

Lemonfox AI is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/lemonfox-ai.json`) rather than hand-written code.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET https://api.lemonfox.ai/v1/models` needs a
> key (it answers HTTP 401 without one), so the two model ids come from the
> vendor's public chat API page, https://www.lemonfox.ai/apis/chat (retrieved
> 2026-09-29), and the roster has not been checked. No account was created and no
> API key was used to build it. `evidence.liveMatrix` is `null` until someone
> runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `lemonfox-ai` (alias `lemonfox`)
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the chat API page says
  "Our OpenAI-compatible API takes a list of messages as input and provides an
  AI-generated (assistant) message as output."
- **Base URL**: `https://api.lemonfox.ai/v1`
- **Default model**: `deepseek-v4-flash`
- **Models in catalog**: 2, taken from the model table of
  https://www.lemonfox.ai/apis/chat
- **Streaming**: supported — the page's `stream` parameter reads "incremental
  message updates are transmitted as server-sent events with data-only
  messages."
- **Tool calling**: not declared (`false`) — the page's API Parameters section
  lists `messages`, `model`, `max_tokens`, `stop`, `stream`,
  `frequency_penalty`, `presence_penalty`, `temperature` and `top_p`
- **Tools while streaming**: not declared (`false`)
- **Structured output**: not declared (`false`), same parameter list as above
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Embeddings**: not declared
- **Thinking**: not declared
- **Billing**: `free-with-card` is the growth queue's classification, one of the
  three values the catalog schema allows; see [Billing](#billing) below for the
  vendor's own wording
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://lemonfox.ai/signup (the "Get started" and "Start Your Free Trial" links on https://www.lemonfox.ai/apis/chat both point to /signup); sign-up was not attempted while building this entry
2. Create an API key at https://lemonfox.ai/apis/keys — https://www.lemonfox.ai/apis/chat links "create an API key" to that page, and the API's 401 reply says "You can obtain an API key from https://lemonfox.ai/apis/keys."
3. Billing as the vendor states it: see [Billing](#billing) below
4. Set `LEMONFOX_AI_API_KEY` in your .env file

### 2. Configure

```bash
export LEMONFOX_AI_API_KEY=your-api-key
export LEMONFOX_AI_MODEL=deepseek-v4-flash   # optional — overrides the default model
export LEMONFOX_AI_BASE_URL=https://api.lemonfox.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "lemonfox-ai",
  model: "deepseek-v4-flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider lemonfox-ai
```

Per-request credentials:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "lemonfox-ai",
  credentials: { lemonfoxAi: { apiKey: process.env.LEMONFOX_AI_API_KEY } },
});
```

---

## Billing

What the vendor's public pages show (retrieved 2026-09-29):

- https://www.lemonfox.ai/ — "Try our APIs for 1 month for free."
- https://www.lemonfox.ai/apis/chat — "First month for free!" and "Start Your
  Free Trial"
- https://www.lemonfox.ai/terms — Lemon Fox GmbH uses Paddle as its Merchant of
  Record and offers "subscription-based pricing and usage-based pricing"

The entry records `free-with-card`, the growth queue's classification, because
the catalog schema has no unknown value; it is not a vendor statement of
sign-up terms.

---

## Models

| Model                  | Context | Price / 1M tokens | Notes                                                                                                                            |
| ---------------------- | ------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `deepseek-v4-flash` ⭐ | 1M      | $0.50             | NeuroLink default. Vendor: "DeepSeek V4 Flash is our default model — fast, cost-effective, and suitable for most tasks."         |
| `mimo-v2.5-pro`        | —       | $1.25             | NeuroLink fallback. Vendor: "MiMo V2.5 Pro is a powerful model from Xiaomi, recommended for complex reasoning and coding tasks." |

Model ids, the 1M context figure and the two prices come from the model table
on https://www.lemonfox.ai/apis/chat (retrieved 2026-09-29), whose price column
is headed "Price / 1M tokens". The table's context text for `deepseek-v4-flash`
reads "Supports a 1M token context window."; the catalog stores it as 1,000,000
(NeuroLink's decimal reading of "1M"). `mimo-v2.5-pro` has no context window set.
The page also shows the model parameter as "Specify the model ID to be used.
Default: deepseek-v4-flash. Also supported: mimo-v2.5-pro."

`models.defaultContextWindow` (32,768) and `models.defaultMaxOutputTokens`
(4,096) are placeholders the vendor does not publish, for model ids outside the
catalog; the page's `max_tokens` parameter reads "integer, optional, default:
infinity". `pricingPerMTok` is unset on both models because the catalog field
takes separate input and output figures and the table has the one "Price / 1M
tokens" column.

Each model's `vision` flag is `false` in the catalog, a placeholder for a
boolean the schema requires; it is not a vendor statement. Each model's
`status` is `production`, a value the schema requires.

**Deprecated models:** a second table on the same page, under the heading
"Deprecated models", lists `llama-8b-chat` ("Deprecated. Llama 3.1 8B — use
deepseek-v4-flash instead.", $0.50) and `llama-70b-chat` ("Deprecated. Llama 3.3
70B — use mimo-v2.5-pro instead.", $1.25). These two ids are not in this catalog.

**Fallback order** when the default is unavailable: `deepseek-v4-flash` →
`mimo-v2.5-pro`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Lemonfox AI — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models`, HTTP 401, 2026-09-29 — no key used; model ids taken from https://www.lemonfox.ai/apis/chat; roster not verified                                                                                                                                                                                  |
| Billing                   | public pages listed under [Billing](#billing), 2026-09-29 — no signup performed                                                                                                                                                                                                                                                    |
| Auth-failure shape        | unauthenticated GETs of `/v1/models`, `/v1/chat/completions` and `/v1` each answered HTTP 401 with the same JSON body (`status` 401, `error.type` `invalid_request_error`, `error.code` null, `error.message` beginning "You didn't provide an API key."); `errorRules` holds one rule, for status `401`; no POST request was sent |
| Tools / structured output | not declared: the parameter list on https://www.lemonfox.ai/apis/chat is `messages`, `model`, `max_tokens`, `stop`, `stream`, `frequency_penalty`, `presence_penalty`, `temperature` and `top_p`, and no request exercising tools or structured output was sent — `structuredOutputWithTools` stays `false`                        |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=lemonfox-ai` with a real key and record the result.                                                                                                         |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                          | Cause                                                                                                                                                                                              | Fix                                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| HTTP 401                                         | The vendor's reply to a request with no key: "You didn't provide an API key. You need to provide your API key in an Authorization header using Bearer auth (i.e. Authorization: Bearer YOUR_KEY)." | Set `LEMONFOX_AI_API_KEY`; keys are at https://lemonfox.ai/apis/keys                                                   |
| `llama-8b-chat` or `llama-70b-chat` set as model | The chat API page lists these ids under "Deprecated models"                                                                                                                                        | The page says "use deepseek-v4-flash instead" for `llama-8b-chat` and "use mimo-v2.5-pro instead" for `llama-70b-chat` |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [Provider guides](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
