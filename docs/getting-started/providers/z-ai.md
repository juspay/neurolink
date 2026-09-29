---
title: Z.AI Provider Guide
description: Z.AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `glm-5.3`
keywords: z-ai, zai, z.ai, glm, openai-compatible, tier 2, provider setup
---

# Z.AI Provider Guide

Z.AI is a **Tier-2 catalog provider**: OpenAI-wire-compatible, so its entire
integration is one JSON file (`src/lib/providers/catalog/z-ai.json`) rather
than hand-written code. That file is the source of truth for everything on this
page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET https://api.z.ai/api/paas/v4/models` needs
> a key (it answers HTTP 401 without one), so the model ids come from Z.AI's
> public docs and the roster has not been checked. No account was created and no
> API key was used to build this entry. `evidence.liveMatrix` is `null` until
> someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `z-ai` (alias `zai`)
- **Protocol**: OpenAI-compatible (`/chat/completions`). The
  [OpenAI Python SDK page](https://docs.z.ai/guides/develop/openai/python.md)
  says "Z.AI provides interfaces compatible with OpenAI API" and adds "In some
  scenarios, there are still differences between Z.AI and OpenAI interfaces, but
  this does not affect overall compatibility."
- **Base URL**: `https://api.z.ai/api/paas/v4` — the
  [Introduction page](https://docs.z.ai/api-reference/introduction.md) calls it
  "Z.ai Platform's general API endpoint". Its warning says GLM Coding Plan users
  follow the Coding Plan tutorial to configure a dedicated endpoint, and the
  [Coding Plan Endpoint Guide](https://docs.z.ai/devpack/quick-start.md) lists
  `https://api.z.ai/api/coding/paas/v4` for OpenAI Chat Completions. This entry
  uses the general endpoint; `Z_AI_BASE_URL` overrides it.
- **Default model**: `glm-5.3` — the default of the `model` parameter in the
  [Chat Completion reference](https://docs.z.ai/api-reference/llm/chat-completion.md)
  and the model in its request examples
- **Models in catalog**: 12, curated from the 21 ids the Chat Completion
  reference lists (14 in its text-model enum, 7 in its vision-model enum). The
  nine ids left out to stay inside the 12-model cap are `glm-4.5-x`,
  `glm-4.5-airx`, `glm-4.5-flash`, `glm-4-32b-0414-128k`, `glm-4.6v`,
  `glm-4.6v-flash`, `glm-4.6v-flashx`, `glm-4.5v` and
  `autoglm-phone-multilingual`
- **Streaming**: supported — the
  [Streaming Messages page](https://docs.z.ai/guides/capabilities/streaming.md)
  documents `stream=True` with Server-Sent Events, and the Chat Completion
  reference says the Event Stream ends with a `data: [DONE]` message
- **Tool calling**: `model-dependent` — the
  [Function Calling page](https://docs.z.ai/guides/capabilities/function-calling.md)
  documents `tools` and a returned `tool_calls` array, and the Chat Completion
  reference says of `tool_choice` "The default value is auto, and only auto is
  supported." For vision models it says tools are "Only supported by
  `GLM-5.3-Flash` series, the GLM-4.6V series, and autoglm-phone-multilingual"
- **Tools while streaming**: supported (`true`) — the
  [Thinking Mode page](https://docs.z.ai/guides/capabilities/thinking-mode.md)
  gives an Interleaved Thinking + Tool Calling example that sends `tools` with
  `stream=True` and reads `tool_calls` from the streamed deltas. The
  [Tool Streaming Output page](https://docs.z.ai/guides/capabilities/stream-tool.md)
  documents a separate `tool_stream` parameter, which this entry does not set.
  The Thinking Mode page also says "thinking blocks should be explicitly
  preserved and returned together with the tool results.", and its example
  appends an assistant message carrying `reasoning_content` and `tool_calls`
  before the tool message; this entry does not set
  `quirks.replayReasoningContent`
- **Structured output**: supported — the
  [Structured Output page](https://docs.z.ai/guides/capabilities/struct-output.md)
  documents `response_format` set to `{"type": "json_object"}`. The Chat
  Completion reference lists `text` and `json_object` as the `response_format`
  type values, so the entry sets `quirks.responseFormatDowngrade` to send
  `json_object` for schema requests; `generate({ schema })` still validates the
  result client-side. No request with `json_schema` was sent. The Chat
  Completion reference says of `response_format` "Only text models support this
  field.", and the
  [GLM-5.3-Flash/FlashX page](https://docs.z.ai/guides/vlm/glm-5.3-flash.md)
  lists Structured Output among its Capabilities ("Supports structured output
  formats such as JSON for seamless system integration.")
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Vision**: `glm-5.3-flash` and `glm-5.3-flashx` — the
  [GLM-5.3-Flash/FlashX page](https://docs.z.ai/guides/vlm/glm-5.3-flash.md)
  shows Input Modality "Video / Image / Text / File". The GLM-5.3 page says
  "text-only inputs", and the pages for the other nine catalog models show
  Input Modalities "Text"
- **Embeddings**: not declared on this catalog entry
- **Thinking**: not declared (`false`) — the entry sets none of the `thinking`
  or `reasoning_effort` request parameters. The Chat Completion reference
  documents both, and the
  [GLM-5.3 page](https://docs.z.ai/guides/llm/glm-5.3.md) says "GLM-5.3 always
  operates with reasoning enabled"
- **Billing**: schema value `free-tier`, see [Billing](#billing) below
- **Key format**: none declared. The Introduction page shows the header
  `Authorization: Bearer ZAI_API_KEY`

---

## Quick Start

### 1. Get an API key

1. Visit: https://z.ai/manage-apikey/apikey-list — the [Quick Start](https://docs.z.ai/guides/overview/quick-start.md) says to access the Z.AI Open Platform (https://z.ai/model-api) and "Register or Login.", then to "Create an API Key" in the API Keys management page and "Copy your API Key for use."
2. Authentication is HTTP Bearer: the Introduction page (https://docs.z.ai/api-reference/introduction.md) shows the header Authorization: Bearer ZAI_API_KEY
3. Billing as the vendor states it: the Quick Start says to open the Billing Page (https://z.ai/manage-apikey/billing) "to top up if needed"; the pricing page (https://docs.z.ai/guides/overview/pricing.md) lists per-1M-token prices and reads "Free" for GLM-4.7-Flash, GLM-4.5-Flash and GLM-4.6V-Flash; the Errors page (https://docs.z.ai/api-reference/api-code.md) lists error 1113 as "Insufficient balance or no resource package. Please recharge."
4. Set `Z_AI_API_KEY` in your .env file

### 2. Configure

```bash
export Z_AI_API_KEY=your-api-key
export Z_AI_MODEL=glm-5.3   # optional — overrides the default model
export Z_AI_BASE_URL=https://api.z.ai/api/paas/v4   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "z-ai",
  model: "glm-5.3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider z-ai
```

Per-request credentials use the same shape as the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "z-ai",
  credentials: { zAi: { apiKey: process.env.Z_AI_API_KEY } },
});
```

---

## Billing

The [Quick Start](https://docs.z.ai/guides/overview/quick-start.md) says to open
the Billing Page (https://z.ai/manage-apikey/billing) "to top up if needed". The
[pricing page](https://docs.z.ai/guides/overview/pricing.md) lists per-1M-token
prices, and its Text Models and Vision Models tables read "Free" in the Input,
Cached Input, Cached Input Storage and Output cells for GLM-4.7-Flash,
GLM-4.5-Flash and GLM-4.6V-Flash. The
[Errors page](https://docs.z.ai/api-reference/api-code.md) lists error 1113
(HTTP 429) as "Insufficient balance or no resource package. Please recharge."

The catalog schema has no unknown billing value, so `billingPolicy` holds
`free-tier`. It is a schema value, not a vendor statement of signup terms.

---

## Models

| Model            | Context | Max output | Vision | $/M in · out (cached)  | Notes                                                                                                                             |
| ---------------- | ------- | ---------- | ------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `glm-5.3` ⭐     | 1M      | 128K       | no     | $1.4 / $4.4 ($0.26)    | NeuroLink default. The GLM-5.3 page says "Z.ai's latest flagship model" and "text-only inputs".                                   |
| `glm-5.3-flash`  | 1M      | 128K       | yes    | $0.15 / $0.50 ($0.03)  | NeuroLink vision model. Input Modality "Video / Image / Text / File".                                                             |
| `glm-5.3-flashx` | 1M      | 128K       | yes    | $0.37 / $1.25 ($0.075) | Input Modality "Video / Image / Text / File"; the page states an inference speed of 200 tokens/s for GLM-5.3-FlashX.              |
| `glm-5.2`        | 1M      | 128K       | no     | $1.4 / $4.4 ($0.26)    | Positioning "Flagship Foundation Model"; Input Modalities "Text".                                                                 |
| `glm-5.1`        | 200K    | 128K       | no     | $1.4 / $4.4 ($0.26)    | Positioning "Flagship Foundation Model"; Input Modalities "Text".                                                                 |
| `glm-5`          | 200K    | 128K       | no     | $1 / $3.2 ($0.2)       | Positioning "Foundation Model"; Input Modalities "Text".                                                                          |
| `glm-4.7`        | 200K    | 128K       | no     | $0.6 / $2.2 ($0.11)    | Input Modalities "Text".                                                                                                          |
| `glm-4.6`        | 200K    | 128K       | no     | $0.6 / $2.2 ($0.11)    | Input Modalities "Text".                                                                                                          |
| `glm-4.5`        | 128K    | 96K        | no     | $0.6 / $2.2 ($0.11)    | Input Modalities "Text"; the page says "GLM-4.5 has a total parameter count of 355B with 32B active parameters per forward pass". |
| `glm-4.5-air`    | 128K    | 96K        | no     | $0.2 / $1.1 ($0.03)    | Input Modalities "Text"; the page describes GLM-4.5-Air as having "106B total parameters and 12B active parameters".              |
| `glm-4.7-flashx` | 200K    | 128K       | no     | $0.07 / $0.4 ($0.01)   | Positioning "Lightweight, High-Speed,and Affordable"; Input Modalities "Text".                                                    |
| `glm-4.7-flash`  | 200K    | 128K       | no     | Free (recorded as 0)   | Positioning "Lightweight, Completely Free"; Input Modalities "Text".                                                              |

Context, max output, positioning and modality values come from the model pages
on docs.z.ai (`/guides/llm/glm-5.3.md`, `glm-5.2.md`, `glm-5.1.md`, `glm-5.md`,
`glm-4.7.md`, `glm-4.6.md`, `glm-4.5.md` and `/guides/vlm/glm-5.3-flash.md`),
retrieved 2026-09-29. Prices come from the
[pricing page](https://docs.z.ai/guides/overview/pricing.md), retrieved
2026-09-29, per 1M tokens: the page prints display names such as GLM-5.3, and
each row is matched to the model id of the same name. Model ids are copied from
the [Chat Completion reference](https://docs.z.ai/api-reference/llm/chat-completion.md)
enums. The catalog records the decimal forms of the labels the vendor prints
(1M, 200K, 128K, 96K).

Each model's `status` in the JSON is `production`, a placeholder for a value the
catalog schema requires; it is not a vendor statement.

`models.defaultContextWindow` (128000) and `models.defaultMaxOutputTokens`
(16000) apply to model ids outside the catalog. They are placeholders the vendor
does not publish: 128000 equals the Context Length label on the GLM-4.5 page and
16000 equals the maximum-output figure the Chat Completion reference gives for
`GLM-4-32B-0414-128K`.

**Fallback order** when the default is unavailable:
`glm-5.2` → `glm-5.1` → `glm-5` → `glm-4.7` → `glm-4.6` → `glm-4.5` →
`glm-4.5-air` → `glm-4.7-flashx` → `glm-4.7-flash` → `glm-5.3-flash` →
`glm-5.3-flashx`. The runtime fallback model name the loader derives
(`fallbacks[1]`) is `glm-5.1`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Z.AI — **docs-verified only, not live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /api/paas/v4/models` answers HTTP 401 without a key (2026-09-29), so model ids are taken from the Chat Completion reference; roster not verified                                                                                                                                                                                               |
| Auth-failure shape        | unauthenticated `GET /models` and `GET /chat/completions` each answered HTTP 401 with `{"error":{"code":"1001","message":"Authentication parameter not received in Header, unable to authenticate"}}` (2026-09-29), matching the error shape on the [Errors page](https://docs.z.ai/api-reference/api-code.md); `errorRules` carry the 401, 1113, 1211 and 429 rows |
| Billing                   | public pages quoted under [Billing](#billing); no signup performed                                                                                                                                                                                                                                                                                                  |
| Tools / structured output | documented on the Function Calling, Thinking Mode and Structured Output pages; neither was exercised live, no POST request was sent, and no combined tools+schema request was sent, so `structuredOutputWithTools` stays `false`. The request fields NeuroLink's chat-completions client can add have not been exercised against Z.AI                               |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=z-ai` with a real key and record the result.                                                                                                                                                 |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

The rows below are the messages the vendor's
[Errors page](https://docs.z.ai/api-reference/api-code.md) lists; NeuroLink's
`errorRules` map them to error classes.

| Symptom                               | What the Errors page says                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| HTTP 401, `error.code` 1001           | "Authentication parameter not received in Header, unable to authenticate"                                           |
| HTTP 401, `error.code` 1000/1003/1005 | "Authentication Failed", "Authentication Token expired, please regenerate/obtain", "Need Two-Factor Authentication" |
| HTTP 429, `error.code` 1113           | "Insufficient balance or no resource package. Please recharge."                                                     |
| HTTP 400, `error.code` 1211           | "Unknown Model, please check the model code."                                                                       |
| HTTP 429, `error.code` 1302           | "Rate limit reached for requests"                                                                                   |
| HTTP 429, `error.code` 1305           | "The service may be temporarily overloaded, please try again later"                                                 |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [Providers index](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
