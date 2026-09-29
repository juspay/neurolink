---
title: Tinfoil Provider Guide
description: Tinfoil on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `kimi-k3`
keywords: tinfoil, openai-compatible, tier 2, provider setup, kimi, gpt-oss, secure enclaves
---

# Tinfoil Provider Guide

Tinfoil is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/tinfoil.json`) rather than hand-written code.
That file is the source of truth for this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** The fields below come from Tinfoil's own public pages and
> two unauthenticated GET requests (`/v1/models` and `/v1/chat/completions`) —
> no account was created and no API key was used to build it.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `tinfoil` (no alias)
- **Protocol**: OpenAI-compatible (`/chat/completions`). The homepage says
  "Our API is OpenAI-compatible, open-source, and fully verifiable."
  ([tinfoil.sh](https://tinfoil.sh)) and the chat models page says "Chat models
  use the OpenAI chat completions API."
  ([docs](https://docs.tinfoil.sh/models/chat))
- **Base URL**: `https://inference.tinfoil.sh/v1`
- **Default model**: `kimi-k3`
- **Models in catalog**: 7 (the seven entries whose roster `type` is `chat`,
  taken from a 17-entry roster)
- **Streaming**: supported — the structured outputs guide shows a request with
  `stream=True` that reads `chunk.choices[0].delta.content`, under the heading
  "Enable Streaming for Large Responses"
  ([docs](https://docs.tinfoil.sh/guides/structured-outputs))
- **Tool calling**: supported (`true`) — the tool-calling guide documents
  function calling ([docs](https://docs.tinfoil.sh/guides/tool-calling)), and
  the roster's `tool_calling` field is `true` on the seven catalog models
- **Tools while streaming**: not declared (`false`) — no combined
  tools-and-streaming request was sent (no credentials were used)
- **Structured output**: supported — the structured outputs guide documents a
  `response_format` of type `json_schema`
  ([docs](https://docs.tinfoil.sh/guides/structured-outputs)), and the seven
  chat model cards carry a "Structured Outputs" line
  ([docs](https://docs.tinfoil.sh/models/chat))
- **Structured output + tools together**: not declared (`false`) — no
  combined probe was run without credentials
- **Embeddings**: not declared (`false`) on this catalog entry. The roster lists
  `nomic-embed-text` with type `embedding`
  ([docs](https://docs.tinfoil.sh/models/embedding)); it is not one of the seven
  catalog models
- **Thinking**: declared (`true`) — the reasoning guide documents a
  `reasoning_effort` request parameter and says the model's thinking is returned
  in the `reasoning` field of the response message
  ([docs](https://docs.tinfoil.sh/guides/reasoning)); the accepted values differ
  by model (see [Reasoning effort](#reasoning-effort))
- **Vision**: four catalog models (`kimi-k3`, `gemma4-31b`, `glm-5-3-flash`,
  `deepseek-v4-1-flash`) — see [Models](#models)
- **Billing**: `free-with-card` — see [Billing](#billing) below
- **Key format**: none validated (`apiKeyFormat` is `null`)
- **Connection security**: NeuroLink calls the endpoint directly over HTTPS —
  see [Direct HTTPS access](#direct-https-access)

---

## Quick Start

### 1. Get an API key

1. Visit: https://dash.tinfoil.sh?tab=api-keys and sign in or sign up — https://docs.tinfoil.sh/get-api-key says "Create an account with your email or one of the social connections."
2. On the dashboard Products page, click Activate on the Private Inference card. Per https://docs.tinfoil.sh/get-api-key, if no payment method is on file you are redirected to a checkout page to enter your card details, and "You’re only charged based on usage."
3. The activation dialog creates a "Default API key" and, per the same page, "adds $1 in API credits to your account"; additional keys are created from API Keys in the sidebar
4. Set `TINFOIL_API_KEY` in your .env file (the examples on https://docs.tinfoil.sh/quickstart read TINFOIL_API_KEY)
5. NeuroLink sends requests straight to https://inference.tinfoil.sh/v1. https://docs.tinfoil.sh/sdk/direct-api-access says "but this is not recommended in production" and "Direct access skips the automatic attestation verification our SDKs perform". https://docs.tinfoil.sh/local-proxy/cli documents a local proxy that verifies enclave attestations and serves http://127.0.0.1:3301/v1 for OpenAI-compatible clients (not exercised with NeuroLink)

### 2. Configure

```bash
export TINFOIL_API_KEY=your-api-key
export TINFOIL_MODEL=kimi-k3   # optional — overrides the default model
export TINFOIL_BASE_URL=https://inference.tinfoil.sh/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "tinfoil",
  model: "kimi-k3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider tinfoil
```

Per-request credentials work as they do for the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "tinfoil",
  credentials: { tinfoil: { apiKey: process.env.TINFOIL_API_KEY } },
});
```

---

## Direct HTTPS access

The catalog's base URL, `https://inference.tinfoil.sh/v1`, is the endpoint the
Tinfoil docs call "direct" access. The docs page for it
([Direct API Access](https://docs.tinfoil.sh/sdk/direct-api-access)) says "but
this is not recommended in production" and "Direct access skips the automatic
attestation verification our SDKs perform, so you have no cryptographic proof
your data is processed in a secure enclave and no protection against
man-in-the-middle attacks." It also says "We maintain direct HTTPS
compatibility for debugging and simple testing (e.g., inference requests via
cURL)."

The coding-agents tutorial says "OpenAI-compatible clients don’t perform
connection-time attestation themselves."
([docs](https://docs.tinfoil.sh/tutorials/coding-agents)) and the
[Tinfoil Proxy CLI page](https://docs.tinfoil.sh/local-proxy/cli) describes a
local proxy that listens on `http://127.0.0.1:3301`, verifies the enclave's
attestation, and takes that address as the base URL for any OpenAI-compatible
client. Pointing `TINFOIL_BASE_URL` at it follows those docs; NeuroLink through
that proxy was not exercised.

---

## Billing

Tinfoil's key guide ([docs](https://docs.tinfoil.sh/get-api-key)) describes the
flow: sign up, click Activate on the Private Inference card, enter card details
at checkout when no payment method is on file ("You’re only charged based on
usage."), and receive a "Default API key" from a dialog that "adds $1 in API
credits to your account". The homepage labels the API "Usage-based pricing"
([tinfoil.sh](https://tinfoil.sh)). The pricing page's Private Chat card lists
$20 per month ([pricing](https://tinfoil.sh/pricing)); Private Chat and Private
Inference are separate entries in the site's Products menu.

The entry records `free-with-card`, the value among the schema's three
(`free-tier`, `free-with-card`, `no-free-tier`) that matches a card at checkout
plus a stated credit. Per-token prices are in the [Models](#models) table.

---

## Models

| Model                 | Context   | Vision | Price per 1M tokens in / out (cached in) | Notes                                                                                                                                                                                                                  |
| --------------------- | --------- | ------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kimi-k3` (default)   | 262,144   | yes    | 4 / 20 (0.8)                             | NeuroLink default. Roster description: "Moonshot's flagship multimodal MoE model with hybrid attention for long-context reasoning, coding, and agentic workflows".                                                     |
| `gpt-oss-120b`        | 131,072   | no     | 0.15 / 0.6                               | Fallback. The first inference example on the [quickstart](https://docs.tinfoil.sh/quickstart) uses this model ID.                                                                                                      |
| `gemma4-31b`          | 262,144   | yes    | 0.4 / 1                                  | Fallback. Strengths value on the chat models page: "Built-in thinking mode, image understanding, native function calling, multilingual support for 35+ languages".                                                     |
| `llama3-3-70b`        | 131,072   | no     | 1.75 / 2.75                              | Fallback. Roster description: "High-performance multilingual language model optimized for dialogue".                                                                                                                   |
| `glm-5-3`             | 1,048,576 | no     | 1.8 / 5.75 (0.45)                        | Roster description: "Z.ai's latest flagship for agentic coding and long-horizon tasks, with a 1M-token context window".                                                                                                |
| `glm-5-3-flash`       | 1,048,576 | yes    | 0.4 / 1.25 (0.1)                         | Roster description: "Z.AI's fast multimodal MoE model with a 1M-token context window, image input, reasoning, and tool calling". Roster field `experimental` is `true`; recorded as `preview`.                         |
| `deepseek-v4-1-flash` | 1,048,576 | yes    | 0.65 / 1.45 (0.13)                       | Roster field `experimental` is `true`; the chat models page shows the warning "this model is not yet fully productionized. Capacity and performance may change while we finish rolling it out." Recorded as `preview`. |

Context and prices are the `context_window` and `pricing` fields of an
unauthenticated `GET https://inference.tinfoil.sh/v1/models` call made
2026-09-29 (17 entries; the seven with type `chat` are the seven models above).
The [chat models page](https://docs.tinfoil.sh/models/chat) gives the Context
values in rounded form: "256K tokens" for `kimi-k3` and `gemma4-31b`, "131K
tokens" for `gpt-oss-120b`, "128K tokens" for `llama3-3-70b`, and "1M tokens" for
`glm-5-3`, `glm-5-3-flash` and `deepseek-v4-1-flash`.
`maxOutputTokens` is unset in the catalog. `models.defaultContextWindow`
(131,072) and `models.defaultMaxOutputTokens` (4,096) are placeholders the
vendor does not publish.

**Status:** `production` is recorded for `kimi-k3`, `gpt-oss-120b`,
`gemma4-31b`, `llama3-3-70b` and `glm-5-3`, whose roster entries do not set
`experimental`. `preview` is recorded for `glm-5-3-flash` and
`deepseek-v4-1-flash`, whose roster entries set `experimental` to `true`.

**Left out of the catalog:** the ten roster entries whose `type` is not `chat`
— `gpt-oss-safeguard-120b` (safety), `pii-filter` (safety), `nomic-embed-text`
(embedding), `doc-upload` (document), `voxtral-small-24b`,
`whisper-large-v3-turbo`, `voxtral-mini-4b-realtime` (audio), `qwen3-tts`,
`voxtral-tts` (tts) and `websearch` (tool). `gpt-oss-safeguard-120b`,
`voxtral-small-24b` and `websearch` list `/v1/chat/completions` among their
`endpoints`.

**Fallback order** when the default is unavailable:
`gpt-oss-120b` → `gemma4-31b` → `llama3-3-70b`. The runtime fallback model name
the loader derives (`fallbacks[1]`) is `gemma4-31b`.

**Vision:** `vision: true` for `kimi-k3`, `gemma4-31b`, `glm-5-3-flash` and
`deepseek-v4-1-flash`. The [image processing guide](https://docs.tinfoil.sh/guides/image-processing)
names those four as supporting image inputs, the
[vision models page](https://docs.tinfoil.sh/models/vision) lists them, and the
roster reports `multimodal: true` for them. For `gpt-oss-120b` and
`llama3-3-70b` the image processing guide says "Other models (Llama, GPT-OSS)
are text-only and cannot process images."; `glm-5-3` has `multimodal: false` on
the roster. No image request was sent.

### Reasoning effort

Accepted `reasoning_effort` values per model, from the
[reasoning guide](https://docs.tinfoil.sh/guides/reasoning):

| Model                 | Supported values                                           |
| --------------------- | ---------------------------------------------------------- |
| `kimi-k3`             | `low`, `high`, `max`                                       |
| `deepseek-v4-1-flash` | `none`, `low`, `high`, `xhigh`, `max`                      |
| `glm-5-3`             | `low`, `high`, `max`                                       |
| `glm-5-3-flash`       | `low`, `high`, `max`                                       |
| `gemma4-31b`          | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` |
| `gpt-oss-120b`        | `low`, `medium`, `high`                                    |

The same page says Kimi K3, GLM-5.3 and GLM-5.3 Flash always use reasoning and
default to `max`, and that sending an unsupported value returns a `400` error.
The [chat models page](https://docs.tinfoil.sh/models/chat) states that for
GLM-5.3 and GLM-5.3 Flash reasoning tokens count toward `max_tokens`, so
structured outputs and strict tool calls at the default effort need a generous
`max_tokens` (around 20K) or a lower effort.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Tinfoil — **docs- and roster-verified, not
live-verified**:

| Probe                              | Result                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                             | unauthenticated `GET https://inference.tinfoil.sh/v1/models`, HTTP 200, 17 entries (7 with type `chat`), 2026-09-29 — a second GET the same day returned an identical body; no key used                                                                                                                                                                                                                |
| Billing                            | public page https://docs.tinfoil.sh/get-api-key, 2026-09-29: card details at checkout when no payment method is on file, "You’re only charged based on usage.", and the activation dialog "adds $1 in API credits to your account"                                                                                                                                                                     |
| Auth-failure shape                 | unauthenticated `GET https://inference.tinfoil.sh/v1/chat/completions`, 2026-09-29, returned HTTP 400 with `{"error":{"message":"Invalid request body: EOF.","type":"invalid_request_error","param":null,"code":"invalid_json"}}`; `errorRules` therefore use the codes and messages documented at https://docs.tinfoil.sh/sdk/error-handling (`invalid_api_key`, `insufficient_quota` on 402 and 429) |
| Tools / structured output / stream | documented at https://docs.tinfoil.sh/guides/tool-calling and https://docs.tinfoil.sh/guides/structured-outputs; none was exercised live, no POST was sent, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                  |
| Live capability sweep              | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=tinfoil` with a real key and record the result.                                                                                                                                                                                 |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                       | Cause                                                                                                                                                                                             | Fix                                                                                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 402 (`insufficient_quota`)               | The docs list message "You exceeded your current quota, please check your plan and billing details." and cause "The account or organization has no remaining balance or an inactive subscription" | Billing in the Tinfoil dashboard sidebar ([docs](https://docs.tinfoil.sh/get-api-key))                                                                                                                                    |
| HTTP 429 (`insufficient_quota`)               | A per-key cap. The docs list the messages "Spend limit reached for this API key.", "Input token limit reached for this API key." and "Output token limit reached for this API key."               | The docs describe a 429 from a per-key cap as not transient, so retrying will not help, and say to raise or clear the cap with Update API Key or use a different key ([docs](https://docs.tinfoil.sh/sdk/error-handling)) |
| HTTP 400 when a `reasoning_effort` is sent    | The reasoning guide says accepted values differ by model and an unsupported value returns a `400` error                                                                                           | Use a value from the per-model table in [Reasoning effort](#reasoning-effort)                                                                                                                                             |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination                                                                                                                       | NeuroLink omits `response_format` automatically whenever tools are present, before sending                                                                                                                                |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
