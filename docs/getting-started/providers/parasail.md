---
title: Parasail Provider Guide
description: Parasail on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `parasail-llama-33-70b-fp8`
keywords: parasail, openai-compatible, tier 2, provider setup, llama, deepseek, kimi, qwen
---

# Parasail Provider Guide

Parasail is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/parasail.json`) rather than hand-written code. That
file is the source of truth for this page. The
[Authentication page](https://docs.parasail.io/parasail-docs/api-reference/authentication.md)
says "The API is fully OpenAI-compatible."

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** Parasail's `GET https://api.parasail.io/v1/models` needs a
> key (an unauthenticated GET on 2026-09-29 answered HTTP 401), so the model ids
> come from Parasail's public docs
> ([Models page](https://docs.parasail.io/parasail-docs/products/overview/models.md),
> retrieved 2026-09-29) and the roster has not been checked. No account was
> created and no API key was used to build this entry. `evidence.liveMatrix` is
> `null` until someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `parasail`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the
  [Authentication page](https://docs.parasail.io/parasail-docs/api-reference/authentication.md)
  says "All Parasail API requests use bearer token authentication. The API is
  fully OpenAI-compatible."
- **Base URL**: `https://api.parasail.io/v1`
- **Default model**: `parasail-llama-33-70b-fp8` (NeuroLink default)
- **Models in catalog**: 12 (curated from the 33 rows of the Models page)
- **Streaming**: supported — the
  [Chat Completions reference](https://docs.parasail.io/parasail-docs/api-reference/chat-completions.md)
  has a Streaming section describing `stream: true` with server-sent events
- **Tool calling**: `model-dependent` — the
  [Tool/Function Calling guide](https://docs.parasail.io/parasail-docs/guides/tool-function-calling.md)
  lists the serverless models that return structured tool calls in a table and
  names other models that "don't support the tools parameter today"
- **Tools while streaming**: not declared (`false`) — no combined request was
  sent
- **Structured output**: supported — the
  [Structured Output guide](https://docs.parasail.io/parasail-docs/guides/structured-output.md)
  documents `response_format` with type `json_schema` and `guided_json`, and
  lists models in a table with a "Guided JSON / JSON Schema" column
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials, so NeuroLink omits `response_format`
  automatically whenever tools are attached
- **Embeddings**: not declared on this catalog entry. The Chat Completions
  reference's endpoint table lists `POST /v1/embeddings`, but NeuroLink's
  generic `ConfiguredOpenAICompatProvider` (the class Tier-2 catalog entries
  use) does not implement `embed()`/`embedMany()`, so this flag tracks that,
  not the vendor's own API surface
- **Thinking**: not declared — the entry sets no reasoning request parameter,
  although the
  [Model-specific Notes page](https://docs.parasail.io/parasail-docs/products/overview/model-specific-notes.md)
  documents model-specific thinking and reasoning controls
- **Billing**: recorded as `no-free-tier`, which is the schema placeholder
  (the catalog schema has no unknown value), not a vendor statement of signup
  terms — see [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://www.saas.parasail.io/keys — the link the [Authentication page](https://docs.parasail.io/parasail-docs/api-reference/authentication.md) gives for getting an API key; sign-in was not attempted while building this entry
2. Create an API key and copy it when it is shown — the Authentication page steps read "Click Create API Key." and "Copy the key immediately—it's displayed only once."
3. Billing as the vendor states it: the [Pricing page](https://docs.parasail.io/parasail-docs/billing/pricing.md) says "To use models, create API keys, and access paid platform services, add a credit card. Without a card, you can still view the platform but can't use models or API keys."
4. Set `PARASAIL_API_KEY` in your .env file (the docs' examples use the environment variable `PARASAIL_API_KEY`)

### 2. Configure

```bash
export PARASAIL_API_KEY=your-api-key
export PARASAIL_MODEL=parasail-llama-33-70b-fp8   # optional — overrides the default model
export PARASAIL_BASE_URL=https://api.parasail.io/v1   # optional
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "parasail",
  model: "parasail-llama-33-70b-fp8",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider parasail
```

Per-request credentials work as they do for other NeuroLink providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "parasail",
  credentials: { parasail: { apiKey: process.env.PARASAIL_API_KEY } },
});
```

---

## Billing

The [Pricing page](https://docs.parasail.io/parasail-docs/billing/pricing.md)
says "To use models, create API keys, and access paid platform services, add a
credit card. Without a card, you can still view the platform but can't use
models or API keys." The
[Limits and Quotas page](https://docs.parasail.io/parasail-docs/operate-in-production/limits-and-quotas.md)
has a rate-limit table with a product class "Serverless - Free" (RPM column
"5"). The catalog's `billingPolicy` field takes one of three values and holds
`no-free-tier` here as a placeholder; it is not a vendor statement of signup
terms.

---

## Models

| Model                                    | Context   | Max output | Vision | $/M in · out (cached)  | Notes                                                                                                                                                                                                          |
| ---------------------------------------- | --------- | ---------- | ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parasail-llama-33-70b-fp8` ⭐           | 131,072   | 16,384     | no     | $0.22 / $0.50 ($0.11)  | NeuroLink default. Chat Completions guide example; Tools ✅ and Tool Choice ✅; Y under Guided JSON / JSON Schema, Regex and Choice.                                                                           |
| `parasail-llama-4-maverick-instruct-fp8` | 524,288   | 32,768     | no     | $0.35 / $1.00 ($0.17)  | Tools ✅ and Tool Choice ✅; Y under Guided JSON / JSON Schema, Regex and Choice. Fallback.                                                                                                                    |
| `parasail-gpt-oss-120b`                  | 131,072   | 131,072    | no     | $0.10 / $0.75 ($0.055) | Tools ✅ and Tool Choice ✅. Model-specific Notes page has "GPT-OSS reasoning control" and "Structured outputs with GPT-OSS" sections. Fallback.                                                               |
| `parasail-gpt-oss-20b`                   | 131,072   | 131,072    | no     | $0.03 / $0.15 ($0.02)  | Tools ✅ and Tool Choice ✅. Same Model-specific Notes sections as `parasail-gpt-oss-120b`. Fallback.                                                                                                          |
| `parasail-deepseek-v4-flash`             | 1,048,576 | 1,048,576  | no     | $0.14 / $0.28 ($0.07)  | Tools ✅ and Tool Choice ✅. Fallback.                                                                                                                                                                         |
| `parasail-deepseek-v4-pro`               | 1,048,576 | 1,048,576  | no     | $1.74 / $3.48 ($0.10)  | Tools ✅ and Tool Choice ✅. Fallback.                                                                                                                                                                         |
| `parasail-kimi-k3`                       | 1,048,576 | 1,048,576  | no     | $3.00 / $15.00 ($0.30) | Tools ✅ and Tool Choice ✅. Fallback.                                                                                                                                                                         |
| `parasail-glm-52`                        | 262,144   | 262,144    | no     | $1.40 / $4.40 ($0.26)  | Tools ✅ and Tool Choice ✅. Fallback.                                                                                                                                                                         |
| `parasail-qwen3p5-35b-a3b`               | 262,144   | 262,144    | no     | $0.15 / $1.00 ($0.05)  | Tools ✅ and Tool Choice ✅; the Tool/Function Calling guide's Chat Completions example uses it. Fallback.                                                                                                     |
| `parasail-qwen25-vl-72b-instruct`        | 128,000   | 128,000    | yes    | $0.80 / $1.00 ($0.40)  | The Multi-Modal guide's image example uses it, hence `vision: true` and `models.visionModel`. Tool/Function Calling guide: "also emits tool calls, but only reliably with" `tool_choice="required"`. Fallback. |
| `parasail-gemma3-27b-it`                 | 131,072   | 131,072    | no     | $0.08 / $0.45 ($0.04)  | Y under Guided JSON / JSON Schema, Regex and Choice. Tool/Function Calling guide names it among models that "don't support the tools parameter today". Fallback.                                               |
| `parasail-minimax-m3`                    | 1,048,576 | 524,288    | no     | $0.30 / $1.20 ($0.06)  | Tools ✅ and Tool Choice ✅. Fallback.                                                                                                                                                                         |

Context window, max output and prices are read from the
[Models page](https://docs.parasail.io/parasail-docs/products/overview/models.md)
(retrieved 2026-09-29), which says "This catalog is generated daily from the
live models endpoint." The
[Pricing page](https://docs.parasail.io/parasail-docs/billing/pricing.md) shows
the same input, output and cached-input figures for each of the 33 rows. The
tool-calling markers come from the
[Tool/Function Calling guide](https://docs.parasail.io/parasail-docs/guides/tool-function-calling.md)
and the Y markers from the
[Structured Output guide](https://docs.parasail.io/parasail-docs/guides/structured-output.md).
The
[Multi-Modal guide](https://docs.parasail.io/parasail-docs/guides/multi-modal.md)
is the source for the one `vision: true`.

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(16,384) are placeholders the vendor does not publish as general values. They
apply to model ids outside the catalog and equal the Context window cell of the
Qwen2.5-VL 72B row and the Max output cell of the Llama 3.3 70B (FP8) row on the
Models page. Each model's `status` is `production`, a value the catalog schema
requires; it is not a vendor statement. Each `vision: false` is a placeholder
for a boolean the schema requires, not a vendor statement.

**Fallback order** when the default is unavailable:
`parasail-llama-4-maverick-instruct-fp8` → `parasail-gpt-oss-120b` →
`parasail-gpt-oss-20b` → `parasail-deepseek-v4-flash` →
`parasail-deepseek-v4-pro` → `parasail-kimi-k3` → `parasail-glm-52` →
`parasail-qwen3p5-35b-a3b` → `parasail-qwen25-vl-72b-instruct` →
`parasail-gemma3-27b-it` → `parasail-minimax-m3`. The runtime fallback model
name the loader derives (`fallbacks[1]`) is `parasail-gpt-oss-120b`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Parasail — **docs-verified only, not yet
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://api.parasail.io/v1/models` answered HTTP 401 on 2026-09-29 — no key used, so the model ids are taken from the Models page (retrieved 2026-09-29) and the roster is not verified                                                                                                                                                                                              |
| Billing                   | the Pricing page says "To use models, create API keys, and access paid platform services, add a credit card. Without a card, you can still view the platform but can't use models or API keys."; the Limits and Quotas page has a "Serverless - Free" rate-limit row; no signup was performed, 2026-09-29                                                                                                 |
| Auth-failure shape        | unauthenticated GETs of `/v1/models`, `/v1/chat/completions` and `/v1` each answered HTTP 401 with content-type `application/json;charset=ISO-8859-1` and the body text "Unauthorized. No bearer token provided." (plain text, no error code field), 2026-09-29; no POST was sent. `errorRules` match the statuses 401, 403, 404 and 429 from the Error responses table of the Chat Completions reference |
| Tools / structured output | documented on the Tool/Function Calling and Structured Output guides; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                                               |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=parasail` with a real key and record the result.                                                                                                                                                                                   |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Documented error statuses

The
[Chat Completions reference](https://docs.parasail.io/parasail-docs/api-reference/chat-completions.md)
says "Errors use OpenAI-compatible status codes and a JSON body with an `error`
object (`message`, `type`, `code`)." and lists these statuses:

| Status | Parasail's description                                                                 |
| ------ | -------------------------------------------------------------------------------------- |
| `400`  | Malformed request—invalid JSON, missing required field, or unsupported parameter value |
| `401`  | Missing or invalid API key                                                             |
| `403`  | API key lacks access to the requested model or resource                                |
| `404`  | Model or endpoint not found                                                            |
| `429`  | Rate limit or quota exceeded—back off and retry                                        |
| `500`  | Internal server error—retry with exponential backoff                                   |

The
[Tool/Function Calling guide](https://docs.parasail.io/parasail-docs/guides/tool-function-calling.md)
says of models outside its table: "Depending on the model, a request with tools
returns an error or plain text with no tool_calls."

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
- Parasail docs pages used for this entry: [Models](https://docs.parasail.io/parasail-docs/products/overview/models.md), [Pricing](https://docs.parasail.io/parasail-docs/billing/pricing.md), [Authentication](https://docs.parasail.io/parasail-docs/api-reference/authentication.md), [Chat Completions reference](https://docs.parasail.io/parasail-docs/api-reference/chat-completions.md), [Tool/Function Calling](https://docs.parasail.io/parasail-docs/guides/tool-function-calling.md), [Structured Output](https://docs.parasail.io/parasail-docs/guides/structured-output.md), [Multi-Modal](https://docs.parasail.io/parasail-docs/guides/multi-modal.md), [Model-specific Notes](https://docs.parasail.io/parasail-docs/products/overview/model-specific-notes.md), [Limits and Quotas](https://docs.parasail.io/parasail-docs/operate-in-production/limits-and-quotas.md)
