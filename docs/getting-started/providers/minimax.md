---
title: MiniMax Provider Guide
description: MiniMax on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `MiniMax-M3`
keywords: minimax, openai-compatible, tier 2, provider setup, minimax-m3
---

# MiniMax Provider Guide

MiniMax is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/minimax.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** MiniMax's `GET https://api.minimax.io/v1/models` answers
> HTTP 401 without a key, so the model ids come from MiniMax's public docs and
> the roster has not been checked. No account was created and no API key was
> used to build the entry. `evidence.liveMatrix` is `null` until someone runs
> the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `minimax`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — MiniMax's own
  [OpenAI SDK page](https://platform.minimax.io/docs/api-reference/text-openai-api)
  sets `OPENAI_BASE_URL=https://api.minimax.io/v1` and calls
  `client.chat.completions.create`
- **Base URL**: `https://api.minimax.io/v1`
- **Default model**: `MiniMax-M3`
- **Models in catalog**: 9 — the nine ids in the Supported Models table of the
  OpenAI SDK page, which are also the `model` enum of the
  [Chat Completions reference](https://platform.minimax.io/docs/api-reference/text-chat-openai)
  (roster not verified)
- **Streaming**: supported — the Chat Completions reference documents `stream`
  ("Whether to use streaming output, defaults to `false`. When set to `true`,
  the response will be returned in chunks.")
- **Tool calling**: `model-dependent` — the Chat Completions reference lists
  `tools` ("Function tools are supported.") and returns `tool_calls`; none of it
  was exercised. With `model-dependent`, NeuroLink falls back to its
  model-registry default per model
- **Tools while streaming**: not declared (`false`)
- **Structured output**: not declared (`false`)
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared
- **Thinking**: the catalog `capabilities.thinking` is `false`, and the entry
  sets none of MiniMax's `thinking`, `reasoning_effort` or `reasoning_split`
  request parameters. The Chat Completions reference says of `MiniMax-M3`:
  "adaptive thinking is on by default", and of `MiniMax-M3.1-Flash-Preview`:
  "always thinks". The OpenAI SDK page says of `max_tokens`: "Thinking tokens
  count toward it too, so a value that is too small yields
  `finish_reason: "length"` with an empty `content`."
- **Vision**: `true` for `MiniMax-M3` and `MiniMax-M3.1-Flash-Preview`, where
  the OpenAI SDK page says "Image and video inputs are supported by
  `MiniMax-M3.1-Flash-Preview` and `MiniMax-M3` through OpenAI-compatible
  message content parts"
- **Billing**: `free-tier` — the schema's closest value, see
  [Billing](#billing) below
- **Key format**: not validated by NeuroLink (`apiKeyFormat: null`)

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.minimax.io/login?source=platform_docs and register or log in (https://platform.minimax.io/docs/guides/quickstart-preparation)
2. Pay-as-you-go: open API Keys > Create new secret key at https://platform.minimax.io/user-center/basic-information/interface-key and copy the API Key (https://platform.minimax.io/docs/guides/quickstart-preparation)
3. Token Plan: view your Subscription Key at https://platform.minimax.io/user-center/payment/token-plan. MiniMax-M3.1-Flash-Preview is stated as available only through Token Plan and MiniMax Code for now, and the Subscription Key is stated as not interchangeable with pay-as-you-go API Keys (https://platform.minimax.io/docs/api-reference/text-openai-api, https://platform.minimax.io/docs/token-plan/intro)
4. Billing as the vendor words it: "Pay-as-you-go uses standard Open Platform API Keys and consumes your account balance by actual usage." (https://platform.minimax.io/docs/guides/pricing-paygo) and "New users without subscription can try the free quota from Pay-as-you-go" (https://platform.minimax.io/docs/solutions/eigent, a tutorial dated January 23, 2026)
5. Set `MINIMAX_API_KEY` in your .env file

### 2. Configure

```bash
export MINIMAX_API_KEY=your-api-key
export MINIMAX_MODEL=MiniMax-M3   # optional — overrides the default model
export MINIMAX_BASE_URL=https://api.minimax.io/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "minimax",
  model: "MiniMax-M3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider minimax
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "minimax",
  credentials: { minimax: { apiKey: process.env.MINIMAX_API_KEY } },
});
```

---

## Billing

MiniMax's pay-as-you-go pricing page
(https://platform.minimax.io/docs/guides/pricing-paygo) says: "Pay-as-you-go
uses standard Open Platform API Keys and consumes your account balance by
actual usage." The Prerequisites page
(https://platform.minimax.io/docs/guides/quickstart-preparation) says: "For
pay-as-you-go, access Billing/Balance to top up if needed." MiniMax's Eigent
tutorial (https://platform.minimax.io/docs/solutions/eigent, dated January 23,
2026 and written for MiniMax M2.1) says: "New users without subscription can
try the free quota from Pay-as-you-go".

The catalog schema has no `unknown` billing value, so the entry records
`free-tier` as the closest value. It is not a MiniMax statement of terms.

---

## Models

| Model                        | Context   | Max output | Vision | $/M in · out (cache read) | Notes                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | --------- | ---------- | ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MiniMax-M3` ⭐              | 1,000,000 | 524,288    | yes    | $0.30 / $1.20 ($0.06)     | NeuroLink default. "Frontier multimodal coding model with 1M context window". Prices are the Standard tab, "≤ 512k input tokens", with $0.60 / $2.40 / $0.12 struck through beside them and the label "Permanent 50% off"; "> 512k input tokens" is $0.60 / $2.40 ($0.12), with $1.20 / $4.80 / $0.24 struck through. Priority tab: "Pricing is 1.5x standard." RPM 200, TPM 10,000,000. |
| `MiniMax-M3.1-Flash-Preview` | 1,000,000 | 524,288    | yes    | —                         | "Frontier multimodal coding model with 1M context window and tunable thinking depth". "MiniMax-M3.1-Flash-Preview is available only through Token Plan and MiniMax Code for now." Not in the fallback chain.                                                                                                                                                                             |
| `MiniMax-M2.7`               | 204,800   | 204,800    | no     | $0.3 / $1.2 ($0.06)       | "Beginning the journey of recursive self-improvement". Cache write $0.375. RPM 500, TPM 20,000,000.                                                                                                                                                                                                                                                                                      |
| `MiniMax-M2.7-highspeed`     | 204,800   | 204,800    | no     | $0.6 / $2.4 ($0.06)       | "M2.7 Highspeed: Same performance, faster and more agile (output speed approximately 100 tps)". Cache write $0.375. RPM 500, TPM 20,000,000.                                                                                                                                                                                                                                             |
| `MiniMax-M2.5`               | 204,800   | 204,800    | no     | $0.3 / $1.2 ($0.03)       | "Peak Performance. Ultimate Value. Master the Complex". Listed under "Legacy Models". Cache write $0.375.                                                                                                                                                                                                                                                                                |
| `MiniMax-M2.5-highspeed`     | 204,800   | 204,800    | no     | $0.6 / $2.4 ($0.03)       | "M2.5 highspeed: Same performance, faster and more agile (output speed approximately 100 tps)". Listed under "Legacy Models". Cache write $0.375.                                                                                                                                                                                                                                        |
| `MiniMax-M2.1`               | 204,800   | 204,800    | no     | $0.3 / $1.2 ($0.03)       | "Powerful Multi-Language Programming Capabilities with Comprehensively Enhanced Programming Experience". Listed under "Legacy Models". Cache write $0.375.                                                                                                                                                                                                                               |
| `MiniMax-M2.1-highspeed`     | 204,800   | 204,800    | no     | $0.6 / $2.4 ($0.03)       | "Faster and More Agile (output speed approximately 100 tps)". Listed under "Legacy Models". Cache write $0.375.                                                                                                                                                                                                                                                                          |
| `MiniMax-M2`                 | 204,800   | not set    | no     | $0.3 / $1.2 ($0.03)       | "Agentic capabilities, Advanced reasoning". Listed under "Legacy Models". Cache write $0.375. Max output is not set; see the paragraph below the table.                                                                                                                                                                                                                                  |

Context windows come from the Supported Models table of the OpenAI SDK page
(https://platform.minimax.io/docs/api-reference/text-openai-api, retrieved
2026-09-29). Max output figures come from the `max_completion_tokens`
description in the Chat Completions reference
(https://platform.minimax.io/docs/api-reference/text-chat-openai): "the maximum
is 524288 (512K)" for `MiniMax-M3.1-Flash-Preview` and `MiniMax-M3`, and "the
maximum is 204800 (200K)" for other models. Prices come from the pay-as-you-go
pricing page (https://platform.minimax.io/docs/guides/pricing-paygo, retrieved
2026-09-29); the `MiniMax-M2.5`, `MiniMax-M2.5-highspeed`, `MiniMax-M2.1`,
`MiniMax-M2.1-highspeed` and `MiniMax-M2` rows sit in that page's Legacy Models
section. Rate limits come from
https://platform.minimax.io/docs/guides/rate-limits.

`MiniMax-M2` has no max output figure in the catalog. The Models page
(https://platform.minimax.io/docs/guides/models-intro), under Legacy Models,
lists "Maximum Output: 128k tokens (including CoT)" for `MiniMax-M2`, while the
Chat Completions reference says "the maximum is 204800 (200K)" for models other
than `MiniMax-M3.1-Flash-Preview` and `MiniMax-M3`. The two pages give different
figures, so the field is left unset for this id.

`vision: true` is set where the OpenAI SDK page states image input.
`vision: false` is set for `MiniMax-M2.7`, `MiniMax-M2.7-highspeed`,
`MiniMax-M2.5`, `MiniMax-M2.5-highspeed`, `MiniMax-M2.1`,
`MiniMax-M2.1-highspeed` and `MiniMax-M2`. The Anthropic API page
(https://platform.minimax.io/docs/api-reference/text-anthropic-api, retrieved
2026-09-29) says in its `messages` row: "The M2.7, M2.5, M2.1, and M2 series
support text and tool-call content blocks only; they do not support image or
video input".

`models.defaultContextWindow` (204,800) and `models.defaultMaxOutputTokens`
(65,536) apply to ids outside the catalog. 204,800 is the context window the
OpenAI SDK page lists for the `MiniMax-M2.x` models, and 65,536 is the
recommended `max_completion_tokens` the Chat Completions reference gives for
models other than `MiniMax-M3.1-Flash-Preview` and `MiniMax-M3`.

**Fallback order** when the default is unavailable:
`MiniMax-M2.7` → `MiniMax-M2.7-highspeed` → `MiniMax-M2.5` →
`MiniMax-M2.5-highspeed` → `MiniMax-M2.1` → `MiniMax-M2.1-highspeed` →
`MiniMax-M2`. The runtime fallback model name is set explicitly to
`MiniMax-M2.7`. `MiniMax-M3.1-Flash-Preview` is in the catalog but not in the
fallback chain, because the vendor states it is available only through Token
Plan and MiniMax Code for now.

**Status values:** `production` is a value the schema requires, not a MiniMax
statement; `preview` is used for the one id the vendor names Preview.

---

## Reasoning output

The OpenAI SDK page says: "For native OpenAI API with `MiniMax-M3.1-Flash-Preview`
`MiniMax-M3` `MiniMax-M2.7` `MiniMax-M2.7-highspeed` `MiniMax-M2.5`
`MiniMax-M2.5-highspeed` `MiniMax-M2.1` `MiniMax-M2.1-highspeed` `MiniMax-M2`
models, the `content` field will contain `<think>` tag content, which must be
preserved completely", and separately: "`MiniMax-M3.1-Flash-Preview` provides the
model's thinking content separately through the `reasoning_content` field,
which must also be preserved completely".

The same page lists `reasoning_split` as an "Output-format switch": "When `true`,
thinking content is separated into the `reasoning_content` field; when `false`,
thinking stays inside `content` wrapped in `<think>` tags." This catalog entry
does not send `reasoning_split`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for MiniMax — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://api.minimax.io/v1/models` answers HTTP 401 without a key (2026-09-29), so model ids are taken from the OpenAI SDK page (retrieved 2026-09-29); **roster not verified**                                                                                                                                                                                                                                                                                                                                                           |
| Auth-failure shape        | unauthenticated `GET https://api.minimax.io/v1/models` returned HTTP 401 with body `{"type":"error","error":{"type":"authorized_error","message":"login fail: Please carry the API secret key in the 'Authorization' field of the request header (1004)","http_code":"401"},"request_id":"…"}` (2026-09-29). An unauthenticated `GET https://api.minimax.io/v1/chat/completions` returned HTTP 404 with `content-type: text/plain` and the body `404 page not found`. No POST was sent, so `errorRules` match status 401 and the vendor's documented messages |
| Billing                   | public pay-as-you-go pricing page, Prerequisites page and Eigent tutorial quoted in [Billing](#billing) above, 2026-09-29 — the schema has no `unknown` value, so `free-tier` is the closest value                                                                                                                                                                                                                                                                                                                                                            |
| Tools / structured output | function calling is documented on the Chat Completions reference and the OpenAI SDK page; nothing was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                                                                                                                                                                               |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=minimax` with a real key and record the result.                                                                                                                                                                                                                                                                                                                                        |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Causes and fixes in quotation marks are MiniMax's wording, with the page named.

| Symptom                                                                                                               | Cause                                                                                                                                                 | Fix                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| HTTP 401 with `login fail: Please carry the API secret key in the 'Authorization' field of the request header (1004)` | The error-code table lists 1004 as "not authorized / token not match group / cookie is missing, log in again" (errorcode page)                        | "please check your API Key and make sure it is correct and active." (https://platform.minimax.io/docs/api-reference/errorcode) |
| Error 1008 "insufficient balance"                                                                                     | Listed in the error-code table                                                                                                                        | "Please check your account balance." (https://platform.minimax.io/docs/api-reference/errorcode)                                |
| Error 1002 "rate limit"                                                                                               | Listed in the error-code table                                                                                                                        | "Please retry your requests later." (https://platform.minimax.io/docs/api-reference/errorcode)                                 |
| Empty `content` with `finish_reason: "length"`                                                                        | "Thinking tokens count toward it too" (OpenAI SDK page, `max_tokens` row)                                                                             | "If generation stops due to `length`, try increasing this value." (Chat Completions reference, `max_completion_tokens`)        |
| `MiniMax-M3.1-Flash-Preview` selected                                                                                 | "MiniMax-M3.1-Flash-Preview is available only through Token Plan and MiniMax Code for now." (https://platform.minimax.io/docs/guides/text-generation) | "Get your Subscription Key" (https://platform.minimax.io/docs/guides/text-generation)                                          |
| Error after setting `temperature` above 2                                                                             | "The `temperature` parameter range is [0, 2], recommended value: 1.0, values outside this range will return an error" (OpenAI SDK page)               | "recommended value: 1.0" (OpenAI SDK page)                                                                                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
- MiniMax pages this entry was built from:
  [OpenAI SDK](https://platform.minimax.io/docs/api-reference/text-openai-api),
  [Chat Completions](https://platform.minimax.io/docs/api-reference/text-chat-openai),
  [Anthropic API](https://platform.minimax.io/docs/api-reference/text-anthropic-api),
  [Models](https://platform.minimax.io/docs/guides/models-intro),
  [Model Invocation](https://platform.minimax.io/docs/guides/text-generation),
  [Pay as You Go](https://platform.minimax.io/docs/guides/pricing-paygo),
  [Rate Limits](https://platform.minimax.io/docs/guides/rate-limits),
  [Error Codes](https://platform.minimax.io/docs/api-reference/errorcode),
  [Prerequisites](https://platform.minimax.io/docs/guides/quickstart-preparation),
  [Token Plan Overview](https://platform.minimax.io/docs/token-plan/intro)
