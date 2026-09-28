---
title: KosCompute Provider Guide
description: Kosmik Compute (KosCompute) on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `qwen/qwen3.8-27b`
keywords: koscompute, kosmik compute, openai-compatible, tier 2, provider setup, qwen
---

# KosCompute Provider Guide

> **Verification status:** this entry is **docs- and roster-verified only —
> not yet live-verified.** It was onboarded credential-free: no KosCompute
> API key was ever created or used. Every field below comes from
> KosCompute's public docs (`https://api.koscompute.com/docs/`) and an
> **unauthenticated** `GET /v1/models` call (no auth header). No `POST`
> request was ever sent, so no generate, stream, tool-calling or
> structured-output capability has been exercised end to end. Treat
> `capabilities.tools`, `.structuredOutput` and `.thinking` as
> documentation-grade, not wire-proven, until `evidence.liveMatrix` is
> filled in by a live run.

KosCompute is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/koscompute.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `koscompute`
- **Protocol**: OpenAI-compatible (`/v1/chat/completions`); the vendor also
  exposes a Responses API and an Anthropic-Messages-compatible surface for
  the same model, neither of which NeuroLink uses here.
- **Base URL**: `https://api.koscompute.com/v1`
- **Default model**: `qwen/qwen3.8-27b`
- **Models in catalog**: 1 — the only chat-capable id KosCompute serves. The
  other 6 ids on the vendor's `/v1/models` roster (`openai/whisper-large-v3`,
  `openai/whisper-large-v3-turbo`, `kosmik/tts-piper-fast`,
  `kosmik/tts-kokoro-quality`, `kosmik/tts-moss-nano`,
  `kosmik/tts-supertonic-3`) are Whisper transcription and TTS models, not
  chat models, so they are excluded from this catalog.
- **Streaming**: documented (`stream: true`, `text/event-stream`, terminal
  `data: [DONE]`) — not live-probed.
- **Tool calling**: documented (`tools` array, `tool_choice`
  `auto`/`none`/`required`/named) and the served model's own
  `supported_features` (from the live `/v1/models` response) list
  `tool_calling` — not live-probed.
- **Structured output**: documented (`response_format` with `json_object`
  and `json_schema`) and the model's `supported_features` list `json_mode`
  and `structured_outputs` — not live-probed. Combining `tools` with a JSON
  schema in one request is **not** documented either way, so
  `structuredOutputWithTools` is declared `false` until a combined probe is
  run.
- **Embeddings**: not documented anywhere in the vendor's docs or roster.
- **Vision**: the default model accepts image input
  (`input_modalities: ["text","image"]`, `vision.max_pixels: 1048576`) per
  the live roster and the vendor's vision guide (HTTPS image URLs and data
  URLs) — not live-probed.
- **Reasoning / thinking**: the model reports `reasoning: true`,
  `extended_thinking: true`, `thinking_default: true`,
  `max_thinking_tokens: 8192`, and
  `supported_reasoning_efforts: ["none", "low", "medium", "xhigh"]` on the
  live roster.
- **Billing**: **unconfirmed.** No pricing, free-tier or top-up page is
  published; the docs only mention an account "balance" in passing. This
  entry sets `billingPolicy: "no-free-tier"` as the conservative default in
  the absence of any documented free allocation — not as a confirmed vendor
  policy.
- **Signup**: **no public signup, dashboard, or key-management page is
  published.** The site's only call-to-action ("Start building") points at
  the docs quickstart, which itself assumes you already hold a key.
- **Key format**: none declared.

---

## Quick Start

### 1. Get an API key

KosCompute does not publish a public signup or key-issuance flow. The
quickstart docs assume the key already exists:

1. Obtain a key out of band (no public signup page exists as of 2026-09-28).
2. Confirm current billing terms directly with KosCompute — none are public.
3. Set `KOSCOMPUTE_API_KEY` in your `.env` file.
4. Optional sanity check before spending a real request:
   `curl https://api.koscompute.com/v1/models` needs no key and returns the
   live roster.

### 2. Configure

```bash
export KOSCOMPUTE_API_KEY=your-api-key
export KOSCOMPUTE_MODEL=qwen/qwen3.8-27b      # optional — overrides the default model
export KOSCOMPUTE_BASE_URL=https://api.koscompute.com/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain speculative decoding in one paragraph." },
  provider: "koscompute",
  model: "qwen/qwen3.8-27b",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider koscompute
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "koscompute",
  credentials: { koscompute: { apiKey: process.env.KOSCOMPUTE_API_KEY } },
});
```

---

## Models

| Model                 | Context                          | Vision | $/M in · out                 | Notes                                                                                                                                                                       |
| --------------------- | -------------------------------- | ------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qwen/qwen3.8-27b` ⭐ | 262,144 (text) / 131,072 (image) | yes    | $0.35 / $2.20 (cached $0.09) | Only chat-capable model in the roster. Reasoning-capable (`extended_thinking`, up to 8,192 thinking tokens, effort levels none/low/medium/xhigh). Max output 32,768 tokens. |

Context window and max output shown are the catalog defaults
(262,144 / 32,768 tokens), taken directly from the model's own entry in the
live, unauthenticated `GET /v1/models` response (`context_length`,
`max_output_length`) on 2026-09-28. Pricing is that same response's
precomputed per-MTok fields (`input`, `output`, `cache_read`).

**Fallback order:** none — `qwen/qwen3.8-27b` is the only chat model
KosCompute serves, so it is both the default and its own (schema-exempt)
single-entry fallback list.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for KosCompute — and, just as importantly, what it does
**not** yet record:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | **unauthenticated** GET `/v1/models`, HTTP 200, 7 models, 2026-09-28. No API key was used or required for this call.                                                                                                                                                                                                                                                                                                                                                                                    |
| Auth rejection        | Not probed. Would require a `POST` with an invalid key, which this credential-free onboarding pass does not send.                                                                                                                                                                                                                                                                                                                                                                                       |
| Live capability sweep | **Not run.** `evidence.liveMatrix` is `null`. `capabilities.tools`, `.structuredOutput`, `.toolsWithStreaming` and `.thinking` are set from the vendor's docs (tool-calling, structured-output and streaming guides) plus the served model's own `supported_features` array on the live roster — not from an executed chat/stream/tool-call/schema request. `structuredOutputWithTools` is `false` because no combined `tools` + `response_format` request was — or could be — attempted without a key. |

Until a live run fills in `evidence.liveMatrix`, treat this provider as
**documentation-grade**: the wire shape (base URL, auth header, request/response
field names) is well-documented and consistent with the standard
OpenAI-compatible contract, but no NeuroLink call has actually exercised it.

---

## Troubleshooting

| Symptom                              | Cause                                                                   | Fix                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid KosCompute API key`         | `KOSCOMPUTE_API_KEY` unset, wrong, expired, or lacks access             | KosCompute's docs describe 401 as "missing, invalid, expired, inactive, or conflicting credentials" but publish no example error body or code string |
| Model not found                      | Wrong model id, or the roster changed since 2026-09-28                  | Pick a current id from an unauthenticated `GET https://api.koscompute.com/v1/models`                                                                 |
| 429 with `concurrent_limit_exceeded` | Per-key concurrency limit exceeded                                      | Wait for an in-flight request to finish, or reduce parallel requests, before retrying                                                                |
| No signup page found                 | Expected — KosCompute publishes no public signup or key-management page | Obtain a key out of band; there is no self-serve console to link to                                                                                  |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
