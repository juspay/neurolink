---
title: Lilac Provider Guide
description: Lilac on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `moonshotai/kimi-k2.6`
keywords: lilac, getlilac, openai-compatible, tier 2, provider setup, kimi, minimax, glm, gemma
---

# Lilac Provider Guide

Lilac is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/lilac.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not
> yet live-verified.** Every model id, context window, output ceiling and
> price below comes from an unauthenticated `GET /v1/models` call (no API
> key used) cross-checked against Lilac's published docs. No request that
> needs a key — chat completions, streaming, tool calls, structured output —
> has been probed end to end. Capability flags reflect only what the docs
> state; run the live matrix (see
> [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry))
> before trusting this provider in production.

---

## Key Facts

- **Provider id**: `lilac`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — docs.getlilac.com
  states Lilac "provides an OpenAI-compatible API. If you're already using
  the OpenAI SDK, you only need to change the base URL and API key."
- **Base URL**: `https://api.getlilac.com/v1`
- **Default model**: `moonshotai/kimi-k2.6`
- **Models in catalog**: 4
- **Streaming**: documented (`stream: true`, SSE); not live-probed
- **Tool calling**: documented ("Function definitions with automatic
  argument extraction," supported for all four current models); not
  live-probed
- **Structured output**: documented (`response_format` with `json_object`
  or `json_schema`, supported for all four current models); not
  live-probed. Gemma 4 carries a documented caveat: combining its reasoning
  parser with `enable_thinking: false` "can silently disable xgrammar-backed
  structured output."
- **Tools + structured output together**: not declared — no combined probe
  was possible without a key
- **Embeddings**: explicitly documented as **not** supported (along with
  audio, fine-tuning, the Assistants API, Batch API and file uploads)
- **Billing**: no free tier — prepaid credit only (Stripe checkout, as
  little as $5), no minimum spend or contract once funded
- **Key format**: none documented
- **Rate limits**: 200 requests/minute per organization; excess requests
  may get HTTP 429 with a `Retry-After` header

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.getlilac.com and sign up with your email or a Google account
2. Create an organization, then go to API Keys in the dashboard and create a new key — it is shown only once, so copy it immediately
3. Go to Billing, click Add Credits and complete the Stripe checkout (as little as $5.00) — a positive credit balance is required before you can make any API request; there is no free tier or free credits
4. Set `LILAC_API_KEY` in your .env file

New-model requests and enterprise monthly-invoicing setup both go through contact@getlilac.com.

### 2. Configure

```bash
export LILAC_API_KEY=your-api-key
export LILAC_MODEL=moonshotai/kimi-k2.6      # optional — overrides the default model
export LILAC_BASE_URL=https://api.getlilac.com/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "lilac",
  model: "moonshotai/kimi-k2.6",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider lilac
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "lilac",
  credentials: { lilac: { apiKey: process.env.LILAC_API_KEY } },
});
```

---

## Models

| Model                     | Context | Vision | $/M in · out                 | Notes                                                                                                                                                                                       |
| ------------------------- | ------- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moonshotai/kimi-k2.6` ⭐ | 262K    | yes    | $0.70 / $3.50 (cached $0.16) | Default — the model used in every code sample on Lilac's own quickstart and chat-completions docs, including its vision example. Roster-verified only, not capability-probed.               |
| `minimaxai/minimax-m3`    | 1M      | yes    | $0.28 / $1.10 (cached $0.05) | Largest context in the roster; native multimodal 428B MoE reasoning model. Fallback.                                                                                                        |
| `zai-org/glm-5.2`         | 512K    | no     | $0.90 / $3.00 (cached $0.17) | Only non-vision model on the roster; its `reasoning_effort` also works as a plain top-level field, not only inside `chat_template_kwargs`. Fallback.                                        |
| `google/gemma-4-31b-it`   | 256K    | yes    | $0.11 / $0.35                | Cheapest model; does not list `structured_outputs` in its supported parameters (only `response_format`), and docs flag a structured-output caveat under `enable_thinking: false`. Fallback. |

Context window and output-ceiling numbers are from `GET /v1/models`
(unauthenticated, 2026-09-28); the API reports the per-model
`max_completion_tokens` equal to that same model's context length, so treat
it as an upper bound rather than a separately proven output cap. Pricing is
cross-checked against https://docs.getlilac.com/inference/models (same
date) and matches exactly.

**Fallback order** when the default is unavailable: `minimaxai/minimax-m3` →
`zai-org/glm-5.2` → `google/gemma-4-31b-it`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Lilac — and, just as importantly, what it does **not**
record yet:

| Probe                 | Result                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                | unauthenticated `GET /v1/models`, HTTP 200, 4 models, 2026-09-28 — ids match the docs page exactly (`google/gemma-4-31b-it`, `minimaxai/minimax-m3`, `moonshotai/kimi-k2.6`, `zai-org/glm-5.2`)                                                                                                              |
| Auth rejection        | **not probed** — a request with an invalid key would need to `POST /v1/chat/completions`, which this onboarding pass deliberately never sends                                                                                                                                                                |
| Live capability sweep | **not run** — no key was available or used. `errorRules` is intentionally empty in the JSON (no documented auth-failure shape to encode); NeuroLink's generic default error classifier (401 → authentication, 429 → rate-limit, 404 → invalid-model) applies until a live probe adds provider-specific rules |
| Billing               | Docs-only: prepaid Stripe credits, no free tier, no minimum spend once funded ("no minimums or contracts"); a positive balance is required before the first request                                                                                                                                          |

Do not treat this provider as production-ready until someone with a Lilac
key runs the live matrix and records the result in
`evidence.liveMatrix`.

---

## Troubleshooting

| Symptom                              | Cause                                                                                                                      | Fix                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Requests fail immediately            | No credit balance — Lilac requires a positive balance before any call succeeds                                             | Add credits via Billing → Add Credits at https://console.getlilac.com                                |
| Model not found                      | The roster changed since 2026-09-28                                                                                        | Pick a current id from the unauthenticated `GET /v1/models` roster                                   |
| Frequent 429s                        | Lilac's documented limit is 200 requests/minute per organization                                                           | Respect the `Retry-After` header and back off; request a higher limit via contact@getlilac.com       |
| Structured output silently malformed | Gemma 4 only — combining its reasoning parser with `enable_thinking: false` can disable structured output per Lilac's docs | Leave `enable_thinking` at its default for Gemma 4, or use a different model for schema-strict calls |
| `embed()` throws                     | Lilac does not support embeddings                                                                                          | Use a provider that does (see [Embeddings](/docs/features/embeddings))                               |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
