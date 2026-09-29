---
title: Bytez Provider Guide
description: Bytez on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `Qwen/Qwen3-4B`
keywords: bytez, openai-compatible, tier 2, provider setup, qwen
---

# Bytez Provider Guide

Bytez is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/bytez.json`) rather than hand-written code. That
file is the source of truth for this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** Bytez's `GET /models` needs a key, so the model ids come from
> its public docs and the roster has not been checked. The fields below come
> from Bytez's own public documentation and unauthenticated `GET` requests — no
> account was created and no API key was used to build it.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `bytez`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the docs' OpenAI-client
  examples create a client with this base URL and call
  `chat.completions.create`
  ([Chat Completions page](https://docs.bytez.com/http-reference/examples/openai-compliant/chatCompletionsExample.md))
- **Base URL**: `https://api.bytez.com/models/v2/openai/v1`
- **Default model**: `Qwen/Qwen3-4B` (NeuroLink default)
- **Models in catalog**: 2 models named in the Bytez docs
- **Streaming**: supported — the "Streaming (Open Source)" example sets
  `stream: true` and reads `event.choices[0].delta.content`
  ([Chat Completions page](https://docs.bytez.com/http-reference/examples/openai-compliant/chatCompletionsExample.md))
- **Request fields listed in the API reference**: `model`, `messages`,
  `max_completion_tokens` (default 256), `temperature` (default 0.7), `stream`,
  `top_p`, `presence_penalty`, `frequency_penalty`, `logprobs` and
  `top_logprobs`
  ([API reference](https://docs.bytez.com/http-reference/oaiCompliant/chatCompletions.md)).
  The examples on the Chat Completions page send `max_tokens`
- **Tool calling**: `false` — declared in this entry and not exercised
- **Tools while streaming**: `false`
- **Structured output**: `false` — declared in this entry and not exercised
- **Structured output + tools together**: `false` — not exercised
- **Embeddings**: not declared on this catalog entry (`false`)
- **Thinking**: not declared (`false`)
- **Billing**: `free-tier` — the Billing & Credits page lists a Free plan,
  "$0 / month - Get $1 in free credits"
  ([Billing & Credits](https://docs.bytez.com/model-api/docs/billing.md))

---

## Quick Start

### 1. Get an API key

1. Open the API Dashboard at https://bytez.com/api; the Get started page (https://docs.bytez.com/model-api/docs/get-started.md) says "Copy your key from the API Dashboard"
2. Free plan (https://docs.bytez.com/model-api/docs/billing.md): "$0 / month - Get $1 in free credits", with "Run open models up to 7B parameters" and "Credits refresh every 4 weeks"; the Billing Cycle section lists Billing: None for the Free Plan
3. The same page lists a Pay-as-you-go plan with "Run open models up to 120B parameters" and "Add credits anytime"
4. Set `BYTEZ_API_KEY` in your .env file

### 2. Configure

```bash
export BYTEZ_API_KEY=your-api-key
export BYTEZ_MODEL=Qwen/Qwen3-4B   # optional — overrides the default model
export BYTEZ_BASE_URL=https://api.bytez.com/models/v2/openai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "bytez",
  model: "Qwen/Qwen3-4B",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider bytez
```

Per-request credentials:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "bytez",
  credentials: { bytez: { apiKey: process.env.BYTEZ_API_KEY } },
});
```

---

## Models

| Model              | Context | Vision | Pricing                 | Notes                                                                                                                                                                                            |
| ------------------ | ------- | ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Qwen/Qwen3-4B` ⭐ | not set | no     | per second of inference | NeuroLink default. The model in the "Basic usage (Open Source)" and "Streaming (Open Source)" examples of the Chat Completions page and in the Basic usage example of the chat Get started page. |
| `Qwen/Qwen3-1.7B`  | not set | no     | not set                 | NeuroLink fallback. Named in the API reference's `model` field description: "The ID of the model to run (e.g., `Qwen/Qwen3-1.7B`, `openai/gpt-4`)".                                              |

Model ids are copied from these pages, retrieved 2026-09-29:

- [Chat Completions page](https://docs.bytez.com/http-reference/examples/openai-compliant/chatCompletionsExample.md)
  — `Qwen/Qwen3-4B`
- [Chat Completions API reference](https://docs.bytez.com/http-reference/oaiCompliant/chatCompletions.md)
  — `Qwen/Qwen3-1.7B`

Open models are billed per second of inference (the "How Credits Work" table on
the [Billing & Credits page](https://docs.bytez.com/model-api/docs/billing.md)).
That page's "Pricing by Model Size" table lists 7B at $0.000072 per second, 15B
at $0.000108, 35B at $0.000144, 70B at $0.000216 and 120B at $0.00036. The
catalog stores no per-token price, because `pricingPerMTok` is a per-token
figure.

`models.defaultContextWindow` (8,192) and `models.defaultMaxOutputTokens`
(1,024) are placeholders the vendor does not publish. The per-model context and
output figures are left unset.

**Vision:** the catalog sets `vision: false` for both models. The Chat
Completions API reference types message content as string.

**Fallback:** `fallbacks` lists `Qwen/Qwen3-1.7B`, which is the runtime fallback
model name the loader derives.

**Not in the catalog:** closed-source provider models (for example
`openai/gpt-4`) are addressed with a provider prefix, and their curl examples on
the Chat Completions page add a `provider-key` header. The catalog schema has no
field for an extra request header, so none are listed.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Bytez — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                    | unauthenticated `GET https://api.bytez.com/models/v2/openai/v1/models` answered HTTP 401 with the body `{"error":"Unauthorized"}`, 2026-09-29 — no key used. The model ids come from the docs pages listed under [Models](#models); the roster has not been checked                                                                                                                                                                                                                                          |
| Auth-failure shape        | unauthenticated `GET` of both `.../v1/models` and `.../v1/chat/completions` answered 401 with `{"error":"Unauthorized"}`, 2026-09-29. The Models API reference describes 401 as "Auth error - check your api key and how you're sending it." ([page](https://docs.bytez.com/http-reference/list/models.md)). `errorRules` carry 401, 402 and 429                                                                                                                                                             |
| Auth header               | the curl examples on the Chat Completions page send `Authorization: BYTEZ_KEY`, and its OpenAI-client examples pass the key as `apiKey`. The [Get started page](https://docs.bytez.com/model-api/docs/get-started.md) has the code comment `# add an Authorization header, with value "Key {BYTEZ_KEY}"` above a curl example that sends `-H "Authorization: BYTEZ_KEY"`. NeuroLink's OpenAI-compatible base sends `Authorization: Bearer <key>` by default. That request was not exercised — it needs a key |
| Billing                   | [Billing & Credits](https://docs.bytez.com/model-api/docs/billing.md) lists a Free plan, "$0 / month - Get $1 in free credits", and its Billing Cycle section lists Billing: None for the Free Plan, 2026-09-29                                                                                                                                                                                                                                                                                              |
| Tools / structured output | declared `false` (see Key Facts for the request fields the API reference lists). Neither was exercised, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                                                                                                                                            |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. The command is `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=bytez`, and it needs a real key.                                                                                                                                                                                                                                                                                                                                              |

This entry is not live-verified until `evidence.liveMatrix` is filled in.

---

## Documented error responses

| Status | What the Bytez docs say                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401    | The Models API reference describes 401 as "Auth error - check your api key and how you're sending it." ([page](https://docs.bytez.com/http-reference/list/models.md))                                                                             |
| 402    | The Billing & Credits page shows the response for an account whose credits ran out with auto-reload disabled, with the message "Insufficient credits. Please add credits to continue." ([page](https://docs.bytez.com/model-api/docs/billing.md)) |
| 429    | The Models API reference documents 429 as "Too Many Requests – You have hit the rate limit."; the Billing & Credits page says requests over the open model rate limits "are rejected with a rate-limit error"                                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
