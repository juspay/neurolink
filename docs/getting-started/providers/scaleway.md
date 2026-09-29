---
title: Scaleway Provider Guide
description: Scaleway on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `mistral-small-3.2-24b-instruct-2506`
keywords: scaleway, generative apis, openai-compatible, tier 2, provider setup, mistral, qwen, llama
---

# Scaleway Provider Guide

Scaleway is a **Tier-2 catalog provider**: an OpenAI-compatible endpoint
described by one JSON file (`src/lib/providers/catalog/scaleway.json`) rather
than hand-written code. That file is the source of truth for everything on this
page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** Scaleway's `GET /v1/models` needs a key (an unauthenticated
> GET answers HTTP 401), so the model ids come from the vendor's public
> supported-models page and the roster has not been checked against the API. No
> account was created and no API key was used to build this entry.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `scaleway`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.scaleway.ai/v1` (the
  [Using Generative APIs page](https://www.scaleway.com/en/docs/generative-apis/api-cli/using-generative-apis/)
  also shows a project-scoped form, `https://api.scaleway.ai/<project_id>/v1`)
- **Default model**: `mistral-small-3.2-24b-instruct-2506`
- **Models in catalog**: 11 — the chat models whose "Available in Serverless?"
  cell on the
  [supported-models page](https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/)
  is Yes and that are not in that page's End of Life table. Left out: models
  whose cell is No or EOL, the audio transcription and embedding models, and
  six Serverless-Yes models that the End of Life table lists
  (`qwen3-coder-30b-a3b-instruct`, `pixtral-12b-2409`, `gemma-3-27b-it`,
  `devstral-2-123b-instruct-2512`, `holo2-30b-a3b`, `voxtral-small-24b-2507`)
- **Streaming**: supported — the
  [Chat Completions reference](https://www.scaleway.com/en/developers/api/generative-apis/chat-completions/)
  documents `stream` with server-sent events and says the last chunk contains
  `data: [DONE]`
- **Tool calling**: `model-dependent` — the
  [function-calling page](https://www.scaleway.com/en/docs/generative-apis/how-to/use-function-calling/)
  says "All the chat models hosted by Scaleway support function calling.", the
  supported-models page's attribute tables carry a "Supports function calling"
  row that reads Yes for each of the eleven catalog ids, and for
  `gpt-oss-120b` it says "Currently, this model should be used through the
  Responses API, because the Chat Completions API does not yet support
  tool-calling for this model."
- **Tools while streaming**: supported — the function-calling page has a "Tool
  calling with stream mode" section
- **Structured output**: supported — the
  [structured-outputs page](https://www.scaleway.com/en/docs/generative-apis/how-to/use-structured-outputs/)
  documents `json_schema` (schema mode) and `json_object` (JSON mode) and says
  "All LLMs in the Scaleway library support Structured outputs and JSON mode."
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Embeddings**: not declared. Scaleway's compatibility page documents an
  Embeddings API and the supported-models page lists embedding models; this
  entry covers chat models
- **Thinking**: not declared (`false`) — the supported-models page lists
  "Supported reasoning efforts" for eight of the catalog models (see the table
  below); the provider-level flag stays `false`
- **Billing**: `free-with-card` (NeuroLink's classification, not a Scaleway
  statement) — see [Billing](#billing) below
- **Key format**: none declared. The vendor's examples call the value
  `SCW_SECRET_KEY`

---

## Quick Start

### 1. Get an API key

1. Visit: https://account.scaleway.com/register?service=console and create a Scaleway account; the quickstart (https://www.scaleway.com/en/docs/generative-apis/quickstart/) lists "A Scaleway account logged into the console" and "A valid API key" as requirements
2. Create an API key (https://www.scaleway.com/en/docs/iam/credentials/create-api-keys/): click IAM & API keys on the top-right drop-down menu of the Scaleway console, open the API keys tab and click + Generate API key. The page says: "A screen displays showing the access key and secret key for your new API key and reminding you that this is your only chance to securely save the secret key." The quickstart passes the secret key as the OpenAI client's api_key. Querying models requires one of the permission sets GenerativeApisModelAccess, GenerativeApisFullAccess or AllProductsFullAccess (https://www.scaleway.com/en/docs/generative-apis/api-cli/using-generative-apis/)
3. Billing as the vendor states it: the pricing page (https://www.scaleway.com/en/pricing/model-as-a-service/) says "Try out new models with our free tier: 1 million tokens and 60 minutes of audio transcription."; the FAQ (https://www.scaleway.com/en/docs/generative-apis/faq/) says "After reaching this limit, you will be charged per million tokens processed and per minutes of audio processed."; the create-account page (https://www.scaleway.com/en/docs/account/how-to/create-an-account/) says "Ordering Scaleway resources requires a valid credit card."; the payment-method page (https://www.scaleway.com/en/docs/billing/how-to/add-payment-method/) says "Before you can order Scaleway resources, you must add a payment method to your account."; the rate-limits page (https://www.scaleway.com/en/docs/generative-apis/reference-content/rate-limits/) says "Base limits apply if you registered a valid payment method, and they are increased automatically if you also verify your identity."
4. Set `SCALEWAY_API_KEY` in your .env file (the vendor's examples read SCW_SECRET_KEY, which NeuroLink does not)

### 2. Configure

```bash
export SCALEWAY_API_KEY=your-api-key
export SCALEWAY_MODEL=mistral-small-3.2-24b-instruct-2506   # optional — overrides the default model
export SCALEWAY_BASE_URL=https://api.scaleway.ai/v1   # optional — proxy or gateway; the project-scoped form is not exercised with NeuroLink
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "scaleway",
  model: "mistral-small-3.2-24b-instruct-2506",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider scaleway
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "scaleway",
  credentials: { scaleway: { apiKey: process.env.SCALEWAY_API_KEY } },
});
```

---

## Billing

Scaleway's pricing page (https://www.scaleway.com/en/pricing/model-as-a-service/)
says "Try out new models with our free tier: 1 million tokens and 60 minutes of
audio transcription." and, under the price table, "You benefit from a free tier
on the first 1,000,000 tokens. You'll be charged from token number 1,000,001."
The FAQ (https://www.scaleway.com/en/docs/generative-apis/faq/) says "There is a
Free Tier available for Serverless." and lists "1,000,000 tokens for models
billed by tokens". Prices on the pricing page are in euros ("Prices before
tax."), which is why the catalog carries no `pricingPerMTok` values.

The create-account page (https://www.scaleway.com/en/docs/account/how-to/create-an-account/)
says "Ordering Scaleway resources requires a valid credit card." The
payment-method page (https://www.scaleway.com/en/docs/billing/how-to/add-payment-method/)
says "Before you can order Scaleway resources, you must add a payment method to
your account.", and the rate-limits page says "Base limits apply if you
registered a valid payment method, and they are increased automatically if you
also verify your identity." The entry records `free-with-card`, which is
NeuroLink's classification of the Free Tier plus those payment-method
sentences, not a Scaleway statement.

---

## Models

| Model                                    | Context (as printed) | Max output (Serverless) | Vision | €/M in · out                 | Notes                                                                                                                                                  |
| ---------------------------------------- | -------------------- | ----------------------- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mistral-small-3.2-24b-instruct-2506` ⭐ | 128k                 | 32k                     | yes    | €0.15 / €0.35                | NeuroLink default; the id named in the Chat Completions reference's model field description and in the rate-limits page's `/chat/completions` example. |
| `llama-3.3-70b-instruct`                 | 100k (Serverless)    | 16k                     | no     | €0.90 / €0.90                | Fallback; the id in the Chat Completions reference's example request. The vendor calls it "text-only (text in/text out)".                              |
| `qwen3-235b-a22b-instruct-2507`          | 250k                 | 16k                     | no     | €0.75 / €2.25                | Fallback.                                                                                                                                              |
| `gemma-4-26b-a4b-it`                     | 256k                 | 32k                     | yes    | €0.25 / €0.50                | Fallback. Reasoning efforts: none, low, medium, high.                                                                                                  |
| `qwen3.6-35b-a3b`                        | 256k                 | 32k                     | yes    | €0.25 / €1.50                | Fallback. Reasoning efforts: none, low, medium, high.                                                                                                  |
| `qwen3.8-27b`                            | 256k                 | 32k                     | yes    | €0.60 (cached €0.12) / €3.30 | Reasoning efforts: none, low, medium, xhigh.                                                                                                           |
| `qwen3.5-397b-a17b`                      | 250k                 | 16k                     | yes    | €0.60 / €3.60                | Reasoning efforts: none, low, medium, high.                                                                                                            |
| `deepseek-v4-flash-0731`                 | 256k                 | 32k                     | no     | €0.40 (cached €0.08) / €0.80 | Footnote: "During the preview stage, the context is limited to 256k". Reasoning efforts: none, low, high, max.                                         |
| `glm-5.2`                                | 256k                 | 16k                     | no     | €1.80 / €5.50                | Footnote: "During the preview stage, the context is limited to 256k". Reasoning efforts: none, high, max.                                              |
| `mistral-medium-3.5-128b`                | 180k                 | 16k                     | yes    | €1.50 / €7.50                | Footnote: "During the preview stage, the context is limited to 180k". Reasoning efforts: none, high.                                                   |
| `gpt-oss-120b`                           | 128k                 | 32k                     | no     | €0.15 / €0.60                | The vendor says the Chat Completions API does not yet support tool-calling for this model. Reasoning efforts: low, medium, high.                       |

Ids, context windows, maximum outputs, modalities and reasoning efforts come from
the [supported-models page](https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/)
and prices from the [pricing page](https://www.scaleway.com/en/pricing/model-as-a-service/)
(region Paris), both retrieved 2026-09-29. The eleven ids in the table appear on
both pages, and the supported-models page's Available in Serverless? cell is Yes
for these eleven ids. The `contextWindow` and
`maxOutputTokens` values in the JSON are the decimal forms of the labels the
vendor prints (256k → 256000). The three preview-marked models carry
`status: "preview"`; the other statuses are `production` because the schema
requires a value, not because Scaleway states it.

**Vision:** `vision: true` marks the models whose Modalities entry lists Vision
(`mistral-small-3.2-24b-instruct-2506`, `gemma-4-26b-a4b-it`,
`qwen3.6-35b-a3b`, `qwen3.8-27b`, `qwen3.5-397b-a17b`,
`mistral-medium-3.5-128b`). The supported-models page says "You will use vision
models through the `/v1/chat/completions` endpoint." No image request was sent.
`models.visionModel` is the default model.

`models.defaultContextWindow` (100,000) and `models.defaultMaxOutputTokens`
(16,000) are placeholders for ids outside the catalog. The vendor does not
publish them; they equal the smallest Serverless context and maximum-output
figures among the catalog models.

**Fallback order** when the default is unavailable:
`llama-3.3-70b-instruct` → `qwen3-235b-a22b-instruct-2507` →
`gemma-4-26b-a4b-it` → `qwen3.6-35b-a3b`. The runtime fallback model name the
loader derives (`fallbacks[1]`) is `qwen3-235b-a22b-instruct-2507`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Scaleway — **docs-verified only, not live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://api.scaleway.ai/v1/models` answered HTTP 401 on 2026-09-29, so the model ids are taken from the supported-models page (retrieved 2026-09-29); the roster has not been checked against the API                                                                                    |
| Auth-failure shape        | unauthenticated `GET /v1/models` and `GET /v1/chat/completions` both answered HTTP 401 with the body `{"status":401,"error":"UNAUTHORIZED","message":"missing 'Authorization' header"}` (2026-09-29); `errorRules` carry 401 and the 403, 422 and 429 statuses listed on the Understanding common errors page |
| Billing                   | the pricing page and FAQ state a Free Tier of 1,000,000 tokens; the create-account, payment-method and rate-limits pages state what the Quick Start quotes; 2026-09-29, no signup performed                                                                                                                   |
| Tools / structured output | documented on the function-calling and structured-outputs pages; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                        |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=scaleway` with a real key and record the result.                                                                                       |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                       | Cause                                                                                                                                                                               | Fix                                                                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 401                                      | The vendor's Understanding common errors page lists 401 as "Unauthorized: The authorization header is missing."                                                                     | Set `SCALEWAY_API_KEY`; the vendor's examples use `SCW_SECRET_KEY`, which NeuroLink does not read                                                          |
| HTTP 403                                      | The vendor's page lists 403 as "Forbidden: Your API key does not exist or does not have the necessary permissions to access the requested resource."                                | The Using Generative APIs page lists the permission sets GenerativeApisModelAccess, GenerativeApisFullAccess and AllProductsFullAccess for querying models |
| HTTP 422                                      | The vendor's page lists 422 as "Model Not Found: The model key is present in the request payload, but the corresponding model is not found."                                        | The Chat Completions reference says "Refer to our supported models list or /models endpoint for available models."                                         |
| HTTP 429                                      | The vendor's page lists 429 as "Too Many Requests" (requests per minute) and "Too Many Tokens" (tokens per minute)                                                                  | The rate-limits page lists ways to raise limits, starting with "Verify your identity to automatically increase your rate limit"                            |
| Tool calls not returned on `gpt-oss-120b`     | The supported-models page says "Currently, this model should be used through the Responses API, because the Chat Completions API does not yet support tool-calling for this model." | NeuroLink's catalog providers call `/chat/completions`                                                                                                     |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination                                                                                                         | NeuroLink omits `response_format` automatically whenever tools are present, before sending                                                                 |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
