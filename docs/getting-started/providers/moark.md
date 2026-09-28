---
title: Moark Provider Guide
description: Moark on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `Qwen3-8B` (docs- and roster-verified, not yet live-verified)
keywords: moark, openai-compatible, tier 2, provider setup, qwen, glm, kimi, deepseek, ernie
---

# Moark Provider Guide

Moark is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no known
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/moark.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

> **Verification status: docs- and roster-verified, not yet live-verified.**
> This entry was onboarded credential-free — no API key was created or used.
> Everything below comes from Moark's public docs
> (`https://moark.com/docs/...`) and an unauthenticated
> `GET https://moark.com/v1/models` (2026-09-28, HTTP 200, 222 models). No
> `chat/completions` request was ever sent, so `capabilities`, error shapes
> and per-model context/output limits are **not** wire-proven. Before relying
> on this provider in production, run the live-verification steps in
> [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry)
> with a funded key.

---

## Key Facts

- **Provider id**: `moark`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — Moark's docs state
  "模力方舟的 Serverless API 兼容开发者喜爱且社区流行的 OpenAI 风格 API"
  (`docs/products/apis/texts/text-generation`, retrieved 2026-09-28)
- **Base URL**: `https://api.moark.com/v1`
- **Default model**: `Qwen3-8B`
- **Models in catalog**: 6 (of 222 live on the full roster — the rest are
  vision/image/video/audio/embedding/reranking models outside this entry's
  chat scope)
- **Streaming**: documented (`stream=True` via the OpenAI Python client)
- **Tool calling**: documented, **model-dependent** — a dedicated Function
  Calling doc page shows the standard OpenAI `tools` / `tool_choice` /
  `tool_calls` shape, but only specific models are named as supporting it
- **Structured output**: not claimed here. Moark documents `guided_json` /
  `guided_choice` (vLLM-style guided-decoding parameters), not the OpenAI
  `response_format` field NeuroLink's generic client sends — no
  `response_format` wire example exists anywhere in the docs
- **Embeddings**: not supported by this entry (embeddings is a separate
  Moark product/model family, out of scope for the chat catalog)
- **Billing**: no free tier documented for API access — prepaid resource
  packages only (models can be tried free in the web console, but that is
  not the same as a keyless API tier)
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://moark.com and sign in — no separate signup page is documented, only workbench login
2. Go to 工作台 → 设置 → 访问令牌 (Workbench → Settings → Access Tokens) at https://moark.com/dashboard/tokens and create a token
3. Fund a prepaid resource package before making live calls (e.g. the all-model package, https://moark.com/serverless-api/order?package=1910) — billing is prepaid, charged per-call or per-token (https://moark.com/docs/products/apis, retrieved 2026-09-28); models can be tried free in the web console, but no formal free-tier API policy is documented, and package usage is non-refundable (https://moark.com/docs/billing/purchase, retrieved 2026-09-28)
4. Set `MOARK_API_KEY` in your .env file

### 2. Configure

```bash
export MOARK_API_KEY=your-api-key
export MOARK_MODEL=Qwen3-8B            # optional — overrides the default model
export MOARK_BASE_URL=https://api.moark.com/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "moark",
  model: "Qwen3-8B",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider moark
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "moark",
  credentials: { moark: { apiKey: process.env.MOARK_API_KEY } },
});
```

---

## Models

| Model                  | Vision | Notes                                                                                                                                                                                                             |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Qwen3-8B` ⭐          | no     | Recommended — Moark's own docs name this (and `Qwen3-4B`) as its suggested free-testing/validation model; the only documented recommendation that also matches a currently-live roster id. Not capability-probed. |
| `Qwen3-4B`             | no     | Named alongside `Qwen3-8B` as a free testing/validation model; smaller sibling. Roster-listed only; fallback.                                                                                                     |
| `ERNIE-4.5-Turbo`      | no     | Baidu ERNIE 4.5 Turbo — Moark's docs suggest this for multilingual use cases. Roster-listed only; fallback.                                                                                                       |
| `GLM-5.3`              | no     | Zhipu GLM-5.3 — on the live roster; not named specifically in Moark's docs. Roster-listed only; fallback.                                                                                                         |
| `kimi-k3`              | no     | Moonshot AI Kimi K3 — closest live match to the docs' "long text" pick (`kimi-k2-instruct`, no longer on the roster). Roster-listed only; fallback.                                                               |
| `DeepSeek-V4-Pro-0813` | no     | DeepSeek V4 Pro — closest live match to the docs' "specialized reasoning" pick (`DeepSeek-R1`, no longer on the roster). Roster-listed only; fallback.                                                            |

No context window, max output tokens or pricing are shown per model.
Moark's docs give only a generic "32K、128K 等" illustration — not tied to
any specific model — and the unauthenticated `GET /v1/models` response
returns only `{id, object, created, owned_by}`, with no `context_length` or
pricing fields. The catalog's `defaultContextWindow` (32,000) and
`defaultMaxOutputTokens` (4,096) are therefore **not vendor-confirmed
per-model figures**: the context number reflects the vendor's own generic
example text, and the output-token number is an unverified conservative
placeholder. Both need a live probe (or an authenticated roster call that
returns real per-model limits) before they can be trusted.

**Fallback order** when the default is unavailable: `Qwen3-4B` →
`ERNIE-4.5-Turbo` → `GLM-5.3` → `kimi-k3` → `DeepSeek-V4-Pro-0813`.

The other 216 models on Moark's roster (vision, image, video, audio,
embedding, reranking, moderation, TTS/ASR, etc.) are intentionally left out
of this catalog entry, which covers only the OpenAI-compatible chat surface.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Moark — **deliberately thinner than a
live-verified entry**, since no key was created:

| Probe                 | Result                                                                                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated `GET https://moark.com/v1/models`, HTTP 200, 222 models, 2026-09-28                                                                                                                                                                        |
| Docs cross-check      | `docs/openapi/v1`, `docs/products/apis`, `docs/products/apis/texts/text-generation`, `docs/products/apis/texts/function-calling`, `docs/billing/purchase` — all fetched 2026-09-28, confirm OpenAI-compatible wire shape, Bearer auth, and prepaid billing |
| Auth rejection        | **not probed** — would require a POST request, out of scope for credential-free onboarding                                                                                                                                                                 |
| Live capability sweep | **not run** — no key was created or used                                                                                                                                                                                                                   |

Because no authenticated or POST request was made, `capabilities.tools` is
recorded as `"model-dependent"` (the docs name specific Function-Calling
models rather than claiming universal support), `structuredOutput` and
`structuredOutputWithTools` are `false` (no `response_format` wire example
exists, only the vendor's own `guided_json`/`guided_choice` extensions), and
`errorRules` is empty (no documented error-body shape was found).

---

## Troubleshooting

| Symptom                                    | Cause                                                                                          | Fix                                                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Requests fail with an auth-shaped error    | `MOARK_API_KEY` unset, wrong, or the account has no funded package                             | Check the token at https://moark.com/dashboard/tokens and confirm a prepaid package is active                                             |
| Model not found                            | The roster changed since 2026-09-28                                                            | Pick a current id from the unauthenticated `GET https://moark.com/v1/models` roster                                                       |
| Structured output not returned as expected | This entry doesn't send `response_format` — Moark only documents `guided_json`/`guided_choice` | Not currently wired through the generic OpenAI-compat client; treat `structuredOutput` as unsupported until a live probe proves otherwise |
| Tool calls silently ignored                | Function calling is documented as model-dependent, not universal                               | Confirm the chosen model is one of Moark's documented Function-Calling models before relying on `tools`                                   |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration, and the live-verification steps this entry still needs
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
