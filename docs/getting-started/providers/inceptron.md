---
title: Inceptron Provider Guide
description: Inceptron on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `zai-org/GLM-5.3`
keywords: inceptron, openai-compatible, tier 2, provider setup, glm, kimi, deepseek
---

# Inceptron Provider Guide

Inceptron is a **Tier-2 catalog provider**: an OpenAI-compatible endpoint
described by one JSON file (`src/lib/providers/catalog/inceptron.json`) rather
than hand-written code.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** The fields below come from Inceptron's own public pages,
> an unauthenticated `GET /v1/models` call and an unauthenticated
> `GET /v1/chat/completions` call — no account was created and no API key was
> used to build it. `evidence.liveMatrix` is `null` until someone runs the live
> capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `inceptron`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the Chat Completions
  API Reference says "Our API is compliant with OpenAI's Chat Completions API"
  ([docs](https://docs.inceptron.io/API%20Reference/chat-completions))
- **Base URL**: `https://api.inceptron.io/v1`
- **Default model**: `zai-org/GLM-5.3`
- **Models in catalog**: 6 (the full 6-model live roster)
- **Streaming**: supported — the Chat Completions API Reference documents the
  `stream` parameter and a streaming response, and there is a
  [Handling Streaming Responses](https://docs.inceptron.io/Guides/streaming-responses)
  guide
- **Tool calling**: `true` — the Chat Completions API Reference and the
  [Tool Calling guide](https://docs.inceptron.io/Guides/tool-calling) describe
  OpenAI-compatible tool calling with `tools` and `tool_choice`, with worked
  examples on `moonshotai/Kimi-K2.6`. The models page tags each of the six
  model cards `tool-calling`
- **Tools while streaming**: `true` — the Chat Completions API Reference has a
  "Streaming Tool Call Response" section and the Tool Calling guide has a
  "Handle Streamed Tool Calls" section
- **Structured output**: `false` on this entry. The Chat Completions API
  Reference request table lists `model`, `messages`, `temperature`,
  `max_tokens`, `stream`, `top_p`, `n`, `stop`, `tools` and `tool_choice`; the
  roster's `supported_features` field lists `json_mode` and `structured_outputs`
  for the six models. Structured output was not exercised live
- **Structured output + tools together**: not declared (`false`) — no
  combined probe was run without credentials
- **Embeddings**: not declared (`false`)
- **Thinking**: not declared (`false`). The models page tags each of the six
  model cards `reasoning`, and the Kilo Code guide configures `reasoningEffort`
  variants `low`, `high` and `max` for `zai-org/GLM-5.3`
- **Billing**: recorded as `no-free-tier` because the catalog schema has no
  `unknown` value — a schema placeholder, not a vendor statement
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.inceptron.io and sign in or sign up — the sign-in page shows Continue with Google, Continue with GitHub and Sign in with email, and links to https://console.inceptron.io/auth/signup
2. Create an API key — the Introduction page says: "After signing up, navigate to the account section of the dashboard to create an API key." (https://docs.inceptron.io/introduction)
3. Set `INCEPTRON_API_KEY` in your .env file (the docs' examples read INCEPTRON_API_KEY)

The Authentication guide
([docs](https://docs.inceptron.io/Guides/authentication)) says:

> You can find your API key in your Inceptron account dashboard under the "API Keys" section.

### 2. Configure

```bash
export INCEPTRON_API_KEY=your-api-key
export INCEPTRON_MODEL=zai-org/GLM-5.3   # optional — overrides the default model
export INCEPTRON_BASE_URL=https://api.inceptron.io/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "inceptron",
  model: "zai-org/GLM-5.3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider inceptron
```

Per-request credentials also work:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "inceptron",
  credentials: { inceptron: { apiKey: process.env.INCEPTRON_API_KEY } },
});
```

---

## Models

| Model                                | Context   | Vision | $/M in · out (cache read) | Notes                                                                                                                                                                                                                  |
| ------------------------------------ | --------- | ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zai-org/GLM-5.3` ⭐                 | 1,048,576 | no     | $1.40 / $4.40 ($0.26)     | NeuroLink default. The model in the docs' Get Started, Introduction, Chat Completions, Error Handling and Streaming code examples and in the Kilo Code and OpenCode config. Tags: text, code, tool-calling, reasoning. |
| `moonshotai/Kimi-K2.6`               | 262,144   | yes    | $0.73 / $3.50 ($0.25)     | NeuroLink fallback. The model in the docs' tool-calling examples. Tags: multimodal, tool-calling, reasoning. `models.visionModel`.                                                                                     |
| `deepseek-ai/DeepSeek-V4-Flash-0731` | 1,048,576 | no     | $0.13 / $0.28 ($0.03)     | NeuroLink fallback. Tags: text, code, tool-calling, reasoning.                                                                                                                                                         |
| `zai-org/GLM-5.2`                    | 1,048,576 | no     | $1.20 / $4.20 ($0.26)     | NeuroLink fallback. Tags: text, code, tool-calling, reasoning.                                                                                                                                                         |
| `moonshotai/Kimi-K2.7-Code`          | 262,144   | yes    | $0.75 / $3.50 ($0.20)     | Tags: multimodal, tool-calling, reasoning.                                                                                                                                                                             |
| `zai-org/GLM-5.3-Flash`              | 1,048,576 | no     | $0.15 / $0.50 ($0.07)     | The vendor homepage shows the text "Try GLM 5.3 Flash". The models page shows "1.3M context"; the roster `context_length` is 1048576 and `contextWindow` uses that figure. Tags: text, code, tool-calling, reasoning.  |

Prices, the context labels ("1M context", "262K context") and the tags come
from the models page, https://www.inceptron.io/models, opened 2026-09-29. The
exact context figures 1,048,576 and 262,144 are the `context_length` values in
an unauthenticated `GET https://api.inceptron.io/v1/models` call made the same
day; for `zai-org/GLM-5.3` the Kilo Code guide also states "GLM-5.3 supports a
1M-token context window (1,048,576 tokens)"
([docs](https://docs.inceptron.io/Guides/kilo-code)). The `pricing` field in the
roster response carries different values from the models page for each of the 6
models; this entry uses the models page.

The roster's `max_output_length` is 1048576 for `zai-org/GLM-5.3`,
`deepseek-ai/DeepSeek-V4-Flash-0731`, `zai-org/GLM-5.2` and
`zai-org/GLM-5.3-Flash`, and 262144 for `moonshotai/Kimi-K2.6` and
`moonshotai/Kimi-K2.7-Code`. The Kilo Code guide's config block for
`zai-org/GLM-5.3` sets `limit` to context 1048576 and output 1048576. No
per-model `maxOutputTokens` is set in the catalog entry.

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(16,384) are NeuroLink placeholders for model ids outside the catalog, not
vendor figures. Each model's `status` field holds `production`, a placeholder
for a value the catalog schema requires; it is not a vendor statement.

The docs' [Models API Reference](https://docs.inceptron.io/API%20Reference/models)
lists 18 ids: `deepseek-ai/DeepSeek-V4-Flash-0731`, `zai-org/GLM-5.3`,
`moonshotai/Kimi-K2.7-Code`, `moonshotai/Kimi-K2.6` and `zai-org/GLM-5.2` with
Deployment Mode `Serverless`, and 13 more with Deployment Mode `Custom`. The
13 `Custom` ids are not in the live roster and not in this catalog.

**Vision:** `moonshotai/Kimi-K2.6` and `moonshotai/Kimi-K2.7-Code` are
`vision: true` from the models page tag `multimodal` and the roster's
`input_modalities` of `["text","image"]`; no image request was sent. The other
four models have `input_modalities` of `["text"]` on the roster and are
`vision: false`.

**Fallback order** when the default is unavailable:
`moonshotai/Kimi-K2.6` → `deepseek-ai/DeepSeek-V4-Flash-0731` →
`zai-org/GLM-5.2`. The runtime fallback model name the loader derives
(`fallbacks[1]`) is `deepseek-ai/DeepSeek-V4-Flash-0731`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Inceptron — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models`, HTTP 200, 6 models, 2026-09-29 — no key used                                                                                                                                                                                                              |
| Auth-failure shape        | unauthenticated `GET https://api.inceptron.io/v1/chat/completions`, HTTP 401, body `{"error":{"code":"unauthorized","message":"Missing or invalid authorization header","type":"invalid_request_error"}}`, 2026-09-29 — no key used. `errorRules` match 401 (probe and docs) and 429 (docs) |
| Tools / structured output | tool calling and streamed tool calls are documented on the Chat Completions API Reference and the Tool Calling guide; neither tools nor structured output was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                     |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=inceptron` with a real key and record the result.                                                                    |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

The Error Handling page (https://docs.inceptron.io/Guides/error-handling) lists
these HTTP status codes, quoted as it shows them:

| Status | Vendor's description                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| 400    | Your request was malformed. This could be due to missing required parameters or invalid JSON. |
| 401    | Your API key is missing, invalid, or disabled.                                                |
| 429    | You have exceeded your rate limit.                                                            |
| 500    | Something went wrong on our end. Please wait and try again.                                   |

---

## Pages opened for this entry

Opened on 2026-09-29 with unauthenticated GET requests:

- https://docs.inceptron.io (Get Started)
- https://docs.inceptron.io/introduction
- https://docs.inceptron.io/API%20Reference/chat-completions
- https://docs.inceptron.io/API%20Reference/models
- https://docs.inceptron.io/Guides/authentication
- https://docs.inceptron.io/Guides/error-handling
- https://docs.inceptron.io/Guides/kilo-code
- https://docs.inceptron.io/Guides/streaming-responses
- https://docs.inceptron.io/Guides/tool-calling
- https://www.inceptron.io/models
- https://www.inceptron.io/pricing
- https://console.inceptron.io
- https://console.inceptron.io/auth/signup
- https://api.inceptron.io/v1/models
- https://api.inceptron.io/v1/chat/completions

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [Providers index](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
