---
title: ai& Provider Guide
description: ai& on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `openai/gpt-oss-120b`
keywords: aiand, ai&, openai-compatible, tier 2, provider setup, gpt-oss, glm, kimi, deepseek
---

# ai& Provider Guide

ai& is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/aiand.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

> **Verification status: docs- and roster-verified, not yet live-verified.**
> Every claim on this page comes from ai&'s own public documentation
> (`https://docs.aiand.com/`) and an unauthenticated `GET /v1/models` call —
> no API key was created or used, and no chat/stream/tool-call request was
> ever sent. Treat capability flags as "documented", not "proven against a
> live response". See [Verification status](#verification-status) below.

---

## Key Facts

- **Provider id**: `aiand`
- **Protocol**: OpenAI-compatible (`/v1/chat/completions`); also exposes an
  Anthropic-shaped `/v1/messages`, a `/v1/responses` endpoint, and legacy
  `/v1/completions`
- **Base URL**: `https://api.aiand.com/v1`
- **Default model**: `openai/gpt-oss-120b` (the model used in ai&'s own
  quickstart example)
- **Models in catalog**: 11
- **Streaming**: documented (SSE, `stream: true`, `data: [DONE]` terminal
  event)
- **Tool calling**: documented (OpenAI `tools` / `tool_choice` /
  `parallel_tool_calls`, gated per-model on a `tool_calling` capability flag
  — all 11 current models have it)
- **Structured output**: documented — `response_format: json_object` (JSON
  mode) and `response_format: json_schema` with `strict: true`. Combined
  `tools` + `response_format` in the same request was **not** probed (no key
  used), so `structuredOutputWithTools` is `false`.
- **Thinking / reasoning effort**: documented — a `reasoning_effort` request
  parameter whose accepted values are per-model (read from each model's
  `reasoning_efforts` in `GET /v1/models`)
- **Embeddings**: not documented — no embeddings endpoint appears anywhere in
  the docs navigation
- **Billing**: no free tier — prepaid credits only, purchased via Stripe
  Checkout; a zero balance returns HTTP 402
- **Key format**: keys start with `sk-`; no further pattern documented

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.aiand.com/playground and sign in (Google, GitHub, or a magic-link email — https://docs.aiand.com/authentication/)
2. Create an organization API key under Organizations → API Keys (https://docs.aiand.com/organizations/api-keys/) — shown in full only once, and starts with sk-
3. ai& is prepaid only, no free tier: add credits via Stripe Checkout before making requests (https://docs.aiand.com/billing/credits/) — a zero balance returns HTTP 402 until credits are added
4. Set `AIAND_API_KEY` in your .env file

### 2. Configure

```bash
export AIAND_API_KEY=your-api-key
export AIAND_MODEL=openai/gpt-oss-120b      # optional — overrides the default model
export AIAND_BASE_URL=https://api.aiand.com/v1   # optional — proxy or regional override
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "aiand",
  model: "openai/gpt-oss-120b",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider aiand
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "aiand",
  credentials: { aiand: { apiKey: process.env.AIAND_API_KEY } },
});
```

---

## Models

| Model                           | Context | Vision            | $/M in · out · cached  | Notes                                                                                                                               |
| ------------------------------- | ------- | ----------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `openai/gpt-oss-120b` ⭐        | 131K    | no                | $0.15 / $0.60 / $0.08  | Default — the model in ai&'s own quickstart example. Cheapest on the roster. `reasoning_effort`: low/medium/high (default medium).  |
| `zai-org/glm-5.3`               | 1M      | no                | $1.00 / $4.00 / $0.30  | "Flagship GLM model for long-horizon coding, agents, and complex project delivery." `reasoning_effort`: low/high/max (default max). |
| `zai-org/glm-5.2`               | 1M      | no                | $1.00 / $4.00 / $0.30  | Prior GLM generation. `reasoning_effort`: none/high/max (default max).                                                              |
| `deepseek-ai/deepseek-v4-pro`   | 1M      | no                | $1.00 / $2.50 / $0.25  | "Open MoE flagship with million-token context for coding and long agent runs." `reasoning_effort`: none/high/max (default none).    |
| `deepseek-ai/deepseek-v4-flash` | 1M      | no                | $0.15 / $0.25 / $0.08  | "Fast DeepSeek V4 lane for economical reasoning, coding, and long-context work." `reasoning_effort`: none/high/max (default none).  |
| `moonshotai/kimi-k3`            | 1M      | listed (see note) | $3.00 / $12.50 / $0.50 | "Multimodal Kimi model with 1M context and toggleable max-effort thinking." `reasoning_effort`: low/high/max (default max).         |
| `moonshotai/kimi-k2.7-code`     | 262K    | listed (see note) | $0.75 / $3.50 / $0.20  | Coding-focused Kimi model. `reasoning_effort`: high only.                                                                           |
| `qwen/qwen3.8-27b`              | 262K    | listed (see note) | $0.40 / $3.00 / $0.20  | Dense 27B vision-language model. `reasoning_effort`: none/low/medium/xhigh (default medium).                                        |
| `qwen/qwen3.6-27b`              | 262K    | listed (see note) | $0.32 / $3.20 / $0.20  | Qwen vision-language model. `reasoning_effort`: none/high (default high).                                                           |
| `motif-technologies/motif-3`    | 262K    | no                | $0.50 / $2.00 / $0.20  | 314B-parameter MoE, 13.2B active per token. `reasoning_effort`: none/high (default high).                                           |
| `google/gemma-4-31b-it`         | 262K    | listed (see note) | $0.20 / $0.50 / $0.05  | Largest Gemma 4 instruction model. `reasoning_effort`: none/high (default none).                                                    |

**Vision note:** five models list a `vision` capability on `GET /v1/models`,
but ai&'s vision docs (`/capabilities/vision/`) describe images and video as
uploaded once through the **Files API** and then referenced by `file_id` in
the chat request — not the inline base64 `image_url` data-URI shape most
other NeuroLink providers use. That flow was not exercised here (no API key
was used), so no model is marked `vision: true`
(`models.visionModel`) in the catalog entry and this should be treated as
**unverified** until a live probe confirms the wire shape NeuroLink sends
actually works against it.

Context window and pricing are from the unauthenticated `GET /v1/models`
response, retrieved 2026-09-28, cross-checked against the docs' Models
Catalog page (`/models/catalog/`). ai&'s docs define `context_window` as the
combined input+output token budget, with no separately published
max-output-tokens figure — hence `defaultMaxOutputTokens` in the catalog
equals `defaultContextWindow`.

**Fallback order** when the default is unavailable: `zai-org/glm-5.3` →
`zai-org/glm-5.2` → `deepseek-ai/deepseek-v4-pro` →
`deepseek-ai/deepseek-v4-flash` → `moonshotai/kimi-k3` →
`moonshotai/kimi-k2.7-code` → `qwen/qwen3.8-27b` → `qwen/qwen3.6-27b` →
`motif-technologies/motif-3` → `google/gemma-4-31b-it`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This entry was built
**without credentials**, from ai&'s public documentation and one
unauthenticated GET request — no signup, no API key, no POST request to the
vendor was made. This is what the catalog records for ai&:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated `GET https://api.aiand.com/v1/models`, HTTP 200, 2026-09-28 — 11 models, cross-checked against `/models/catalog/` and `/models/pricing/`                                                                                                                                                                                                                                                                                                        |
| Auth rejection        | not probed — sending any request (even with an invalid key) is outside credential-free scope; the 401 `authentication_error` / `invalid_api_key` shape in `errorRules` is transcribed from `https://docs.aiand.com/errors/`, not observed live                                                                                                                                                                                                                  |
| Live capability sweep | **not performed.** `evidence.liveMatrix` is `null`. `capabilities.tools`, `.structuredOutput`, `.streaming` and `.thinking` are set from ai&'s documented request parameters (`tools`, `response_format`, `stream`, `reasoning_effort` — see `https://docs.aiand.com/api/chat-completions/`), not from an executed request. `structuredOutputWithTools` is `false` because the combined `tools` + `response_format` request that would prove it was never sent. |

**Before this entry graduates past docs-only status**, someone with a funded
account should run the live-verification steps in
[Tier-2 onboarding: Live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification) —
an authenticated roster probe, an auth-failure probe, and the capability
matrix (`npx tsx test/continuous-test-suite-provider-matrix.ts --provider=aiand`)
— and update `evidence.liveMatrix` with the result.

---

## Troubleshooting

| Symptom                                      | Cause                                                                                    | Fix                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Invalid ai& API key`                        | `AIAND_API_KEY` unset or wrong                                                           | Check the key at https://console.aiand.com/playground                                                     |
| `HTTP 402` / insufficient credits            | ai& is prepaid-only with no free tier                                                    | Add credits via Stripe Checkout at https://docs.aiand.com/billing/credits/                                |
| `429` rate limited                           | Documented per-key/per-org rate limits                                                   | Check the `X-RateLimit-Policy` response header and back off                                               |
| `tools` request rejected on a non-tool model | The chosen model lacks the `tool_calling` capability                                     | Pick a model whose `GET /v1/models` entry lists `tool_calling` (all 11 catalog models currently do)       |
| Vision request fails or is ignored           | ai& expects images/video via the Files API (`file_id`), not inline `image_url` data URIs | Not yet supported by this integration in the standard NeuroLink flow — treat vision as unverified for now |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
