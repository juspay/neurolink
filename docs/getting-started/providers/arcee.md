---
title: Arcee Provider Guide
description: Arcee on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `trinity-large-thinking`
keywords: arcee, trinity, openai-compatible, tier 2, provider setup
---

# Arcee Provider Guide

Arcee is a **Tier-2 catalog provider**: OpenAI-wire-compatible, so its entire
integration is one JSON file (`src/lib/providers/catalog/arcee.json`) rather
than hand-written code. That file is the source of truth for everything on this
page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET https://api.arcee.ai/api/v1/models` needs a
> key (it answers HTTP 401 without one), so the model ids come from Arcee's
> public docs and the roster has not been checked. No account was created and no
> API key was used to build this entry. `evidence.liveMatrix` is `null` until
> someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `arcee`
- **Protocol**: OpenAI-compatible (`/chat/completions`). The
  [Your First API Call page](https://docs.arcee.ai/api-reference/your-first-api-call.md)
  says "The Arcee Platform API is OpenAI compatible."
- **Base URL**: `https://api.arcee.ai/api/v1` — the `base_url` value in the
  [Quick Start](https://docs.arcee.ai/get-started/quick-start.md) Python example
  and the `baseURL` value in its JavaScript example. The
  [Your First API Call page](https://docs.arcee.ai/api-reference/your-first-api-call.md)
  table lists `base_url` as `https://api.arcee.ai/api/v1/chat/completions`;
  `wire.baseURL` is the value the SDK examples set
- **Default model**: `trinity-large-thinking` — the API Model Name the
  [Arcee Model Overview](https://docs.arcee.ai/arcee-language-models/arcee-model-overview.md)
  lists for Trinity-Large-Thinking (400B), which the page says is "the only Arcee
  model available via api."
- **Models in catalog**: 10 — the ten rows of the "Text Models" table on the
  [pricing page](https://docs.arcee.ai/get-started/pricing.md)
- **Streaming**: supported — the
  [Streaming Messages page](https://docs.arcee.ai/capabilities/streaming-messages.md)
  says "To enable streaming, set `stream=True`."
- **Tool calling**: `model-dependent` — the
  [Function Calling page](https://docs.arcee.ai/capabilities/function-calling.md)
  documents the `tools` parameter and the `tool_calls` output with a
  `MODEL_NAME` placeholder, and the
  [Trinity-Large-Thinking page](https://docs.arcee.ai/arcee-language-models/trinity-large-thinking.md)
  lists "Purpose-built for tool calling, multi-step planning, and agent
  workflows" under Key Features
- **Tools while streaming**: `false` — not exercised, since no POST request was
  sent
- **Structured output**: `true` — the
  [Structured Outputs page](https://docs.arcee.ai/capabilities/structured-outputs.md)
  documents the `response_format` value `{'type': 'json_object'}`. Under "To
  enable JSON Output, users should:" the page lists "Include the word "json" in
  the system or user prompt, and provide an example of the desired JSON format
  to guide the model in outputting valid JSON." and "Set the `max_tokens`
  parameter reasonably to prevent the JSON string from being truncated
  midway."
  `quirks.responseFormatDowngrade` is set so a `generate({ schema })` request
  sends `json_object`; NeuroLink still validates the response against your
  schema on the client. No request with `json_schema` was sent
- **Structured output + tools together**: `false` — no combined probe was run
  without credentials
- **Embeddings**: `false`
- **Thinking**: `false` — the entry sets no thinking-level request parameter.
  The [Reasoning Traces page](https://docs.arcee.ai/capabilities/reasoning-traces.md)
  documents the `reasoning_content` response field for Trinity-Large-Thinking
- **Reasoning replay (`quirks.replayReasoningContent: true`)**: the
  Trinity-Large-Thinking page says "thinking tokens must be kept in context for
  multi-turn conversations and agentic loops to function correctly", and the
  Reasoning Traces page says "use `reasoning_content` when constructing
  assistant messages for input". NeuroLink sends each assistant turn's
  `reasoning_content` back on later requests. No multi-turn request was sent
- **Billing**: schema value `no-free-tier`, see [Billing](#billing) below
- **Key format**: none declared. The
  [Chat Completion reference](https://docs.arcee.ai/api-reference/chat-completion.md)
  gives the key format as "Arcee API key (prefixed with `rcai-`)"; NeuroLink does
  not validate it because no key was available to test it

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.arcee.ai/api/api-keys — the [Quick Start](https://docs.arcee.ai/get-started/quick-start.md) says to access the Arcee Platform (https://platform.arcee.ai/), "Register or Login.", then to "Create an API Key in the API Keys management page." and "Copy your API Key for use and store in a secure location."
2. Authentication is HTTP Bearer: the Quick Start's curl example sends the header Authorization: Bearer YOUR_API_KEY, and the Chat Completion reference (https://docs.arcee.ai/api-reference/chat-completion.md) gives the key format as "Arcee API key (prefixed with `rcai-`)"
3. Billing as the vendor states it: the Quick Start says to open the Wallet (https://platform.arcee.ai/api/wallet) "to top up if needed"; the Chat Completion reference lists HTTP 402 as "Insufficient Balance"
4. Set `ARCEE_API_KEY` in your .env file

### 2. Configure

```bash
export ARCEE_API_KEY=your-api-key
export ARCEE_MODEL=trinity-large-thinking   # optional — overrides the default model
export ARCEE_BASE_URL=https://api.arcee.ai/api/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "arcee",
  model: "trinity-large-thinking",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider arcee
```

Per-request credentials use the same shape as the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "arcee",
  credentials: { arcee: { apiKey: process.env.ARCEE_API_KEY } },
});
```

---

## Billing

The [Quick Start](https://docs.arcee.ai/get-started/quick-start.md) says to open
the Wallet (https://platform.arcee.ai/api/wallet) "to top up if needed". The
[Chat Completion reference](https://docs.arcee.ai/api-reference/chat-completion.md)
lists HTTP 402 as "Insufficient Balance". The
[pricing page](https://docs.arcee.ai/get-started/pricing.md) says "All prices are
in USD." and lists prices per 1M tokens.

The catalog schema has no unknown billing value, so `billingPolicy` holds
`no-free-tier`. It is a schema value, not a vendor statement of signup terms.

---

## Models

| Model                               | Context | Vision | $/M in · out (cached)  | Notes                                                                                                                                                                                        |
| ----------------------------------- | ------- | ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trinity-large-thinking` ⭐         | 128,000 | no     | $0.25 / $0.80 ($0.06)  | NeuroLink default. Strength "Robust generalist model with strong performance across reasoning, coding, math, and complex task decomposition." Context Window "512k tokens (hosted at 128k)". |
| `deepseek/deepseek-v4-flash-latest` | —       | no     | $0.14 / $0.28 ($0.028) | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |
| `zai-org/glm-5.3-flash`             | —       | no     | $0.15 / $0.50 ($0.03)  | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |
| `thinkingmachines/inkling-small`    | —       | no     | $0.50 / $1.20 ($0.10)  | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |
| `deepseek/deepseek-v4-pro-0813`     | —       | no     | $1.32 / $3.96 ($0.044) | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |
| `deepseek/deepseek-v4-pro`          | —       | no     | $1.74 / $3.48 ($0.20)  | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |
| `zai-org/glm-5.2`                   | —       | no     | $1.40 / $4.40 ($0.26)  | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |
| `zai-org/glm-5.3`                   | —       | no     | $1.40 / $4.40 ($0.26)  | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |
| `moonshotai/kimi-k3`                | —       | no     | $3.00 / $15.00 ($0.30) | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |
| `deepseek/deepseek-v4.1-flash`      | —       | no     | $0.22 / $0.66 ($0.007) | NeuroLink fallback; listed under "Text Models".                                                                                                                                              |

Model ids and prices are copied from the
[pricing page](https://docs.arcee.ai/get-started/pricing.md), retrieved
2026-09-29; the page says "This page provides pricing information for all models
on Arcee Platform." and "Prices per 1M Tokens." The default's id, Context Window
and Strength come from the
[Arcee Model Overview](https://docs.arcee.ai/arcee-language-models/arcee-model-overview.md),
retrieved 2026-09-29. A `—` in the Context column means the catalog carries no
`contextWindow` for that model, so it uses `models.defaultContextWindow`.

On [www.arcee.ai/trinity](https://www.arcee.ai/trinity) the card titled "Trinity
Large Thinking (400B, 13B active)" gives "Arcee API — served at 256K context at
BF16" after its "Deploy on:" label. The Arcee Model Overview gives "512k tokens
(hosted at 128k)" for the same model. The two vendor pages give different hosted
context figures; the catalog's `contextWindow` for `trinity-large-thinking` is
128000, the Model Overview figure, the page that lists the API Model Name.

The Vision column shows the `vision` value in the JSON, `false` on the ten rows.
It is a placeholder for a boolean the catalog schema requires; it is not a
vendor statement.

Each model's `status` in the JSON is `production`, a placeholder for a value the
catalog schema requires; it is not a vendor statement.

`models.defaultContextWindow` (128000) and `models.defaultMaxOutputTokens`
(8192) apply to model ids outside the catalog and to catalog rows without their
own `contextWindow` or `maxOutputTokens` (nine rows have no `contextWindow`; ten
rows have no `maxOutputTokens`). They are placeholders the vendor does not
publish for those model ids; 128000 is the same number as the "hosted at 128k"
figure the Arcee Model Overview gives for `trinity-large-thinking`.

**Fallback order** when the default is unavailable follows the row order of the
pricing page: `deepseek/deepseek-v4-flash-latest` → `zai-org/glm-5.3-flash` →
`thinkingmachines/inkling-small` → `deepseek/deepseek-v4-pro-0813` →
`deepseek/deepseek-v4-pro` → `zai-org/glm-5.2` → `zai-org/glm-5.3` →
`moonshotai/kimi-k3` → `deepseek/deepseek-v4.1-flash`. The runtime fallback
model name the loader derives (`fallbacks[1]`) is `zai-org/glm-5.3-flash`.

**Model changes.** The
[Deprecation Policy](https://docs.arcee.ai/policies/deprecation-policy.md) says
"Cloud models are versioned and may be replaced quickly when new improvements
are available." and "Typical notice for standard cloud models: up to 5 business
days".

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Arcee — **docs-verified only, not live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /api/v1/models` answers HTTP 401 without a key (2026-09-29), so model ids are taken from the pricing page; roster not verified. The [Models reference](https://docs.arcee.ai/api-reference/models.md) documents this endpoint with a 401 response described as "Authentication Fails"                                                                               |
| Auth-failure shape        | unauthenticated `GET /models` answered HTTP 401 with header `www-authenticate: Bearer` and body `{"detail":"Missing or invalid Authorization header. Expected: Bearer <api_key>"}` (2026-09-29); the [Chat Completion reference](https://docs.arcee.ai/api-reference/chat-completion.md) Error schema has one property, `detail`. `errorRules` carry the 401, 402, 403, 429 and 503 rows |
| `/chat/completions` GET   | unauthenticated `GET /chat/completions` answered HTTP 405 with header `allow: POST` and body `{"error":{"message":"Method Not Allowed","type":"invalid_request_error","param":null,"code":"request.rejected"}}` (2026-09-29). No POST request was sent                                                                                                                                   |
| Billing                   | public pages quoted under [Billing](#billing); no signup performed                                                                                                                                                                                                                                                                                                                       |
| Tools / structured output | documented on the Function Calling and Structured Outputs pages; neither was exercised live, no POST request was sent, and no combined tools+schema request was sent, so `structuredOutputWithTools` stays `false`. The request fields NeuroLink's chat-completions client can add have not been exercised against Arcee                                                                 |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=arcee` with a real key and record the result.                                                                                                                                                                     |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

The rows below are the statuses the vendor's
[Chat Completion reference](https://docs.arcee.ai/api-reference/chat-completion.md)
lists; NeuroLink's `errorRules` map 401, 402, 403, 429 and 503 to error classes.

| Symptom  | What the Chat Completion reference says |
| -------- | --------------------------------------- |
| HTTP 400 | "Invalid Format"                        |
| HTTP 401 | "Authentication Fails"                  |
| HTTP 402 | "Insufficient Balance"                  |
| HTTP 403 | "Permission Denied"                     |
| HTTP 404 | "Not Found"                             |
| HTTP 422 | "Invalid Parameters"                    |
| HTTP 429 | "Rate Limit Reached"                    |
| HTTP 500 | "Server Error"                          |
| HTTP 503 | "Server Overloaded"                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [Providers index](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
