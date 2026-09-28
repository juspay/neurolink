---
title: Sarvam AI Provider Guide
description: Sarvam AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `sarvam-105b`
keywords: sarvam, sarvamai, openai-compatible, tier 2, provider setup, reasoning
---

# Sarvam AI Provider Guide

Sarvam AI is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/sarvam.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

> **Verification status: docs- and roster-verified, not yet live-verified.**
> This entry was onboarded credential-free — no Sarvam API key was ever
> created or used. Every field below is sourced from Sarvam's own published
> docs plus one unauthenticated `GET /v1/models` call; no authenticated
> request (chat completion, streaming, tool call, structured output) has
> been made against the live API. Treat `tools`, `structuredOutput`,
> `toolsWithStreaming` and `thinking` as documented, not wire-proven, until
> `evidence.liveMatrix` is filled in by a live capability sweep. See
> [Verification status](#verification-status) below for exactly what is and
> isn't proven.

---

## Key Facts

- **Provider id**: `sarvam`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.sarvam.ai/v1`
- **Default model**: `sarvam-105b`
- **Models in catalog**: 2 (this is the entire roster — the endpoint serves
  only these two)
- **Streaming**: documented (SSE, `stream: true`)
- **Tool calling**: documented (native `tools` / `tool_choice`)
- **Structured output**: documented (`response_format: json_schema` and
  `json_object`)
- **Reasoning / thinking**: documented — a `reasoning_effort` request
  parameter (`low` / `high` / `max`, default `medium`) and a
  `reasoning_content` response field
- **Embeddings**: not documented
- **Billing**: free-tier — every new account gets ₹100 in starter credits,
  then usage-based billing
- **Key format**: `sk_xxx` (documented prefix, exact character set not
  specified)

---

## Quick Start

### 1. Get an API key

1. Visit: https://dashboard.sarvam.ai and sign in or create an account
2. Create an API subscription key from the dashboard (documented format:
   `sk_xxx`)
3. Every new account receives ₹100 in starter credits, then usage-based
   billing applies — see the
   [pricing page](https://docs.sarvam.ai/api/getting-started/pricing.md); no
   ongoing free tier beyond that starter credit is documented
4. Set `SARVAM_API_KEY` in your .env file

### 2. Configure

```bash
export SARVAM_API_KEY=your-api-key
export SARVAM_MODEL=sarvam-105b                    # optional — overrides the default model
export SARVAM_BASE_URL=https://api.sarvam.ai/v1    # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "sarvam",
  model: "sarvam-105b",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider sarvam
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "sarvam",
  credentials: { sarvam: { apiKey: process.env.SARVAM_API_KEY } },
});
```

### Authentication note

Sarvam's own raw-HTTP API reference examples authenticate with a standard
`Authorization: Bearer <token>` header — exactly what NeuroLink's generic
OpenAI-compatible provider sends, so no custom auth-header quirk is needed.
Sarvam's stated preference is instead an `api-subscription-key` header,
which its Python/TypeScript SDKs use; the docs say both are accepted on
every endpoint.

---

## Models

| Model                       | Context | Vision | $/M in · out | Notes                                                                                              |
| --------------------------- | ------- | ------ | ------------ | -------------------------------------------------------------------------------------------------- |
| `sarvam-105b` ⭐            | 128K    | no     | —            | Recommended — flagship model, documented for "complex reasoning and agentic tasks." Default model. |
| `sarvam-105b-conversations` | 32K     | no     | —            | Documented for "real-time conversational and voice-agent workloads." Fallback.                     |

Context window shown is each model's documented figure (128K / 32K). The
catalog's `defaultMaxOutputTokens` is 2048 — the vendor's documented default
for the `max_tokens` request parameter when a caller omits it, not a stated
maximum (the docs say no maximum is documented).

**Pricing** is published only in Indian Rupees, not USD: ₹29.28 input /
₹73.2 output / ₹10.98 cached-input per 1M tokens for both models
(identical rates), per the
[pricing page](https://docs.sarvam.ai/api/getting-started/pricing.md)
(retrieved 2026-09-28). The catalog's `pricingPerMTok` field is left unset
for both models rather than placing that INR figure in a field every other
provider in this catalog uses for USD — there is no vendor-stated INR/USD
rate to convert by without inventing a number.

**Fallback order** when the default is unavailable:
`sarvam-105b-conversations`.

Neither model is documented as vision-capable. The request schema does
declare an `image_url` content-part type (the standard OpenAI-compatible
message shape), but Sarvam's docs make no claim that either model actually
processes image input, so both are marked `vision: false`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Sarvam AI — and, unusually, all of it is credential-free:

| Probe                 | Result                                                                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | **Unauthenticated** GET `https://api.sarvam.ai/v1/models`, HTTP 200, 2026-09-28 — returned exactly `sarvam-105b` and `sarvam-105b-conversations`, no API key used.                                                                                                                        |
| Auth rejection        | Not probed live (would require a POST request, out of scope for credential-free onboarding). The 403 shape below is transcribed from Sarvam's own authentication docs, not observed.                                                                                                      |
| Wire compatibility    | Documentary only — Sarvam's API reference explicitly describes an OpenAI-shaped `messages` / `choices` / `finish_reason` / `object: "chat.completion"` schema, `tools`/`tool_choice`, `response_format` (`json_schema`, `json_object`), and `stream: true` (SSE) for this endpoint.       |
| Live capability sweep | **Not run.** `evidence.liveMatrix` is `null`. `tools`, `structuredOutput`, `toolsWithStreaming` and `thinking` in the catalog reflect vendor documentation, not a live probe; `structuredOutputWithTools` is `false` because no combined tools+schema request was possible without a key. |

Documented auth failure shape (from
[Sarvam's authentication docs](https://docs.sarvam.ai/api-reference/authentication),
not independently observed): HTTP **403**, not 401 — Sarvam's docs state
"Auth failures return HTTP `403`, not `401`" and use the same code for both
bad keys and valid-but-forbidden requests:

```json
{
  "error": {
    "code": "invalid_api_key_error",
    "message": "Invalid API key"
  }
}
```

---

## Troubleshooting

| Symptom                                    | Cause                                                                                | Fix                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `Invalid Sarvam AI API key`                | `SARVAM_API_KEY` unset or wrong                                                      | Check the key at https://dashboard.sarvam.ai                                     |
| HTTP 403 on every call                     | Sarvam returns 403 (not 401) for both bad and forbidden keys                         | Confirm the key is current and has access; see `error.code` in the response      |
| Model not found                            | Only `sarvam-105b` and `sarvam-105b-conversations` exist                             | Use one of those two ids — the endpoint serves no others                         |
| Empty/short replies at a small `maxTokens` | `reasoning_effort` defaults to `medium`, and `reasoning_content` is billed as output | Give reasoning prompts a generous `maxTokens` budget or lower `reasoning_effort` |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
