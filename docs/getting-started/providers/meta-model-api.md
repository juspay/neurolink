---
title: Meta Model API Provider Guide
description: Meta Model API on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `muse-spark-1.3`
keywords: meta, meta-model-api, muse, muse spark, openai-compatible, tier 2, provider setup
---

# Meta Model API Provider Guide

Meta Model API is a **Tier-2 catalog provider**: OpenAI-wire-compatible, so its
entire integration is one JSON file
(`src/lib/providers/catalog/meta-model-api.json`) rather than hand-written
code. That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET https://api.meta.ai/v1/models` needs a key
> (an unauthenticated GET on 2026-09-29 answered HTTP 401), so the model ids
> come from Meta's public docs and the roster has not been checked. No account
> was created and no API key was used to build this entry.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `meta-model-api`
- **Protocol**: OpenAI-compatible (`/chat/completions`). The
  [Chat Completions page](https://dev.meta.ai/docs/protocols/chat-completions)
  says "The endpoint is OpenAI-compatible" and "The response matches the OpenAI
  chat completions shape."
- **Base URL**: `https://api.meta.ai/v1` — the Base URL in the At a glance
  block of the [Overview](https://dev.meta.ai/docs/overview), and the
  `base_url` value in the Chat Completions page's OpenAI SDK examples
- **Default model**: `muse-spark-1.3` — the [Models page](https://dev.meta.ai/docs/models)
  says "muse-spark-1.3 is the default model in the code examples throughout
  these docs."
- **Models in catalog**: 5 — the five rows of the "Available Muse Spark models"
  table on the Models page (three Standard tier, two Contributor tier)
- **Streaming**: supported — the Chat Completions page says "Set stream=True to
  enable streaming:"
- **Tool calling**: `true` — the
  [Tool calling page](https://dev.meta.ai/docs/tool-calling) says "tool calling
  is fully supported there too" for Chat Completions
- **Tools while streaming**: `true` — the Tool calling page says "Tool-call
  arguments stream: With stream: true, the model streams arguments
  incrementally."
- **Structured output**: `true` — the
  [Structured output page](https://dev.meta.ai/docs/structured-output) says
  "Set response_format to type: "json_schema" and provide your schema in the
  json_schema field."
- **Structured output + tools together**: `false` — no combined probe was run
  without credentials
- **Embeddings**: `false`
- **Thinking**: `false` — the entry sets no thinking-level request parameter.
  The [Chat Completions page](https://dev.meta.ai/docs/protocols/chat-completions)
  says "Muse Spark always reasons, so reasoning_effort: "none" returns HTTP
  400." The [Reasoning page](https://dev.meta.ai/docs/reasoning) documents the
  request parameter: "On Chat Completions, use the top-level reasoning_effort
  parameter."
- **Billing**: schema value `no-free-tier`, a placeholder; see
  [Billing](#billing) below
- **Key format**: `LLM|{id}|{secret}` — the
  [Error handling page](https://dev.meta.ai/docs/error-handling) lists
  `Malformed API key (not in LLM|{id}|{secret} format)` as a cause of HTTP 401;
  the entry's `apiKeyFormat` is `^LLM\|.+\|.+$`

---

## Quick Start

### 1. Get an API key

1. Visit: https://dev.meta.ai/ — the page carries a "Start building" button whose link target is /api/auth/login
2. Create an API key: the Authentication page (https://dev.meta.ai/docs/authentication) lists the steps "Log in and open the API keys tab.", "Click Create API key, give it a descriptive name, and click Create." and "Copy the key right away. You only see it once."
3. Authentication is a Bearer token: the Authentication page says "Pass the key as a Bearer token in the Authorization header:", and the Error handling page (https://dev.meta.ai/docs/error-handling) lists `Malformed API key (not in LLM|{id}|{secret} format)` as a cause of HTTP 401
4. Billing as the vendor states it: the Pricing page (https://dev.meta.ai/docs/pricing-rate-limits) says "You pay only for what you use." and the Authentication and billing page (https://dev.meta.ai/docs/muse-code/auth) says "Meta Model API billing is usage-based: you're billed for the tokens your requests consume."
5. Set `META_MODEL_API_API_KEY` in your .env file (the vendor's examples read `MODEL_API_KEY`, which NeuroLink does not)

### 2. Configure

```bash
export META_MODEL_API_API_KEY=your-api-key
export META_MODEL_API_MODEL=muse-spark-1.3   # optional — overrides the default model
export META_MODEL_API_BASE_URL=https://api.meta.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "meta-model-api",
  model: "muse-spark-1.3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider meta-model-api
```

Per-request credentials use the same call shape as the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "meta-model-api",
  credentials: { metaModelApi: { apiKey: process.env.META_MODEL_API_API_KEY } },
});
```

---

## Billing

The Pricing page (https://dev.meta.ai/docs/pricing-rate-limits) says "You pay
only for what you use." and lists these prices per 1M tokens:

| Tier        | Cached input | Input | Output |
| ----------- | ------------ | ----- | ------ |
| Standard    | $0.15        | $1.25 | $4.25  |
| Contributor | $0.002       | $0.10 | $0.20  |

The Authentication and billing page (https://dev.meta.ai/docs/muse-code/auth)
says "Meta Model API billing is usage-based: you're billed for the tokens your
requests consume." and lists two steps for a team admin: "Add a payment method."
and "Create an API key." The Pricing page's Muse Voice Transcribe paragraph says
"ZDR is priced at parity with Standard, and platform free-tier credits apply."

The entry records the schema value `no-free-tier` as a placeholder: the schema
has no unknown value, and the value is not a vendor statement.

Rate limits on the Pricing page: Standard tier 3,000 requests per minute and
4,000,000 tokens per minute; Contributor tier 100 requests per minute and
3,000,000 tokens per minute. The page says "Limits apply per team, not per API
key."

---

## Models

| Model                        | Tier        | Context   | Vision | $/M in · out (cached input) | Notes                                                                                                                                                                                                                                 |
| ---------------------------- | ----------- | --------- | ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `muse-spark-1.3` ⭐          | Standard    | 1,048,576 | yes    | $1.25 / $4.25 ($0.15)       | NeuroLink default. Models page: "the latest version, tuned for agentic workflows (multi-step tool, browser, and long-horizon tasks) with improved coding over 1.2." and "Recommended for new work." Output figure 131072 (see below). |
| `muse-spark-1.2`             | Standard    | 1,048,576 | yes    | $1.25 / $4.25 ($0.15)       | NeuroLink fallback. Models page: "the previous version." Home page card: "A coding-optimized model purpose-built for agentic workflows."                                                                                              |
| `muse-spark-1.1`             | Standard    | 1,048,576 | yes    | $1.25 / $4.25 ($0.15)       | NeuroLink fallback. Models page: "the original version." Home page card: "Built for agentic workflows, coding, computer use & multimodal perception."                                                                                 |
| `muse-spark-1.3-contributor` | Contributor | 1,048,576 | yes    | $0.10 / $0.20 ($0.002)      | Models page: the Contributor variant "trades a lower price for permission to train on your prompts and completions". Not in `models.fallbacks`.                                                                                       |
| `muse-spark-1.2-contributor` | Contributor | 1,048,576 | yes    | $0.10 / $0.20 ($0.002)      | Models page: the Contributor variant "trades a lower price for permission to train on your prompts and completions". Not in `models.fallbacks`.                                                                                       |

Context, tier and input modalities come from the "Available Muse Spark models"
table on the [Models page](https://dev.meta.ai/docs/models) (retrieved
2026-09-29); prices come from the
[Pricing page](https://dev.meta.ai/docs/pricing-rate-limits). The Models page
lists `muse-image-1.0`, `muse-voice-transcribe-1.0` and `sam-3.1` in separate
per-family tables; they are not in this catalog. The Chat Completions page says
"Chat Completions serves the Muse Spark text models."

**Output figure:** `muse-spark-1.3` carries `maxOutputTokens: 131072`, the
value in the [Coding agents guide](https://dev.meta.ai/docs/coding-agents)
entry for that model id: "Limits: context = 1048576, output = 131072".
`models.defaultContextWindow` (1,048,576) is the context window the
[Overview](https://dev.meta.ai/docs/overview) and Models pages state for the
Muse Spark models. `models.defaultMaxOutputTokens` (16,384) is a NeuroLink
placeholder that the vendor does not publish.

**Vision:** the five catalog models are `vision: true`. The "Available Muse
Spark models" table on the Models page lists image among their input
modalities, and the
[Image understanding page](https://dev.meta.ai/docs/image-understanding) says
"image understanding is fully supported" on Chat Completions.

**Status:** the `status` field of the five models holds `production`, a
placeholder for a value the catalog schema requires; it is not a vendor
statement.

**Fallback order** when the default is unavailable: `muse-spark-1.2` →
`muse-spark-1.1`. The runtime fallback model name the loader derives
(`fallbacks[1]`) is `muse-spark-1.1`. The Contributor-tier ids are in
`models.catalog` and `models.topModels`; `models.fallbacks` lists the
Standard-tier ids.

---

## Vendor-documented request parameters

These are statements on Meta's own pages about request fields on Chat
Completions. They are quoted as written and were not exercised against the API.

| Request                       | What the vendor page says                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tool_choice` other than auto | Tool calling page: "tool_choice must be "auto": Only "auto" (the default) is supported on both Chat Completions and the Responses API; "none", "required", and named function choices return HTTP 400" |
| `reasoning_effort: "none"`    | Chat Completions page: "Muse Spark always reasons, so reasoning_effort: "none" returns HTTP 400."                                                                                                      |
| `n` above 1                   | Chat Completions page: "Only n=1 is supported; values greater than 1 return HTTP 400."                                                                                                                 |
| `stop`                        | Chat Completions page, OpenAI compatibility notes table: "Not supported on reasoning models. This matches OpenAI's behavior on o3 and o4-mini."                                                        |
| `logprobs: true`              | Chat Completions page: "logprobs: true returns HTTP 400"                                                                                                                                               |
| `max_tokens`                  | Chat Completions page, Parameters table: "The deprecated alias max_tokens is still accepted."                                                                                                          |
| `system` role                 | Chat Completions page: "accepted for OpenAI compatibility and treated at the same level as developer"                                                                                                  |

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Meta Model API — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://api.meta.ai/v1/models` answered HTTP 401 on 2026-09-29, so model ids are taken from the [Models page](https://dev.meta.ai/docs/models); the roster has not been checked. The [List models reference](https://dev.meta.ai/docs/api-reference/models/list-models) shows `GET /models` called with a Bearer key            |
| Auth-failure shape        | unauthenticated `GET https://api.meta.ai/v1/models`: HTTP 401, `content-type: application/json`, body `{"error":{"code":"invalid_api_key","message":"Unauthorized","param":null,"type":"authentication_error"}}`. An unauthenticated `GET https://api.meta.ai/v1/chat/completions` answered HTTP 401 with the same body and the header `allow: POST` |
| Billing                   | public Pricing and Authentication and billing pages, quoted in [Billing](#billing) above; no signup performed, 2026-09-29                                                                                                                                                                                                                            |
| Tools / structured output | documented on the Tool calling and Structured output pages; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                    |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=meta-model-api` with a real key and record the result.                                                                                                                        |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

The Vendor statement column quotes the vendor's own pages.

| Symptom                             | Vendor statement                                                                                                                                                    | NeuroLink note                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| HTTP 401                            | Error handling page: "The API key was missing, invalid, or revoked." Its fix line: "Send a valid Authorization: Bearer $MODEL_API_KEY header."                      | NeuroLink reads `META_MODEL_API_API_KEY`; the vendor's examples use `MODEL_API_KEY` |
| HTTP 402                            | Error handling page: "The request cannot be completed due to a billing issue." Its fix line: "Check account status and billing details in the Model API dashboard." | The example body's `error.code` is `billing_not_configured`                         |
| HTTP 404, code `model_not_found`    | Quickstart page: "404 model_not_found: use a valid model ID such as muse-spark-1.3 (the default in these examples) or muse-spark-1.1 exactly."                      | The five catalog ids are listed in [Models](#models)                                |
| HTTP 429                            | Error handling page: "Your team has exceeded the rate limit." Its fix line: "Implement exponential backoff with jitter."                                            | Limits are listed in [Billing](#billing)                                            |
| HTTP 504 on a non-streaming request | Chat Completions page: "a non-streaming request that runs too long returns HTTP 504". Error handling page fix line: "Stream the response by setting stream: true."  | Use `neurolink.stream()` for a streamed request                                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
- Meta Model API pages opened for this entry: [Home](https://dev.meta.ai/), [Overview](https://dev.meta.ai/docs/overview), [Quickstart](https://dev.meta.ai/docs/quickstart), [Authentication](https://dev.meta.ai/docs/authentication), [Models](https://dev.meta.ai/docs/models), [Pricing and rate limits](https://dev.meta.ai/docs/pricing-rate-limits), [Chat Completions](https://dev.meta.ai/docs/protocols/chat-completions), [Tool calling](https://dev.meta.ai/docs/tool-calling), [Structured output](https://dev.meta.ai/docs/structured-output), [Reasoning](https://dev.meta.ai/docs/reasoning), [Image understanding](https://dev.meta.ai/docs/image-understanding), [Coding agents](https://dev.meta.ai/docs/coding-agents), [Authentication and billing](https://dev.meta.ai/docs/muse-code/auth), [Error handling](https://dev.meta.ai/docs/error-handling)
