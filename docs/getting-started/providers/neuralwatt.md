---
title: Neuralwatt Provider Guide
description: Neuralwatt on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `glm-5.3`
keywords: neuralwatt, openai-compatible, tier 2, provider setup, glm, qwen, kimi, deepseek
---

# Neuralwatt Provider Guide

Neuralwatt is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/neuralwatt.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status**: this entry is **docs- and roster-verified, not yet
> live-verified**. It was onboarded credential-free — no API key was created,
> no signup was completed, and no authenticated or `POST` request was sent to
> Neuralwatt. Everything below comes from Neuralwatt's public documentation
> (`docs.neuralwatt.com`) and an unauthenticated `GET /v1/models` call. See
> [Live verification](#live-verification-still-needed) for what a follow-up
> pass with a real key still needs to confirm.

---

## Key Facts

- **Provider id**: `neuralwatt`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.neuralwatt.com/v1`
- **Default model**: `glm-5.3` — the model used in every code sample on
  Neuralwatt's own quickstart page (curl, Python and Node.js)
- **Models in catalog**: 8 (of 21 on the live roster; see
  [Models](#models))
- **Streaming**: supported (`stream: true`, SSE, terminal `data: [DONE]`)
- **Tool calling**: **model-dependent**. Neuralwatt's own tool-calling guide
  states plainly that "not all models support tool calling" and directs
  callers to check each model's capabilities before relying on it — every
  model in this catalog currently reports `tools: true` on the live roster,
  but that can change per model, so NeuroLink declares this
  `"model-dependent"` rather than a blanket `true`.
- **Structured output**: **not documented**. The `/v1/models` roster exposes
  a `json_mode: true` capability flag on every model, but the chat-completions
  API reference does not document a `response_format` parameter anywhere —
  neither `json_object` nor `json_schema` mode is described. Because the
  request-side contract isn't documented, `capabilities.structuredOutput` is
  left `false` here rather than trusted from the flag alone.
- **Tools + streaming together / tools + structured output together**: not
  documented and not probed (credential-free onboarding), so both are `false`.
- **Embeddings**: not supported (no embeddings endpoint in the docs)
- **Thinking / reasoning**: supported — `reasoning_effort`
  (`none`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max`) and
  `thinking_token_budget` are documented request parameters, and each
  model's roster entry declares its own reasoning defaults.
- **Billing**: free-with-card — new accounts start at a $0 balance; adding a
  payment method grants a $1.00 trial credit valid 30 days, then usage is
  pay-per-token
- **Key format**: starts with `sk-`; full character set not specified in the
  docs, so `apiKeyFormat` is left `null` rather than guessed
- **Notable extras**: per-request energy and cost reporting via SSE comment
  lines (`: energy {...}`, `: cost {...}`) and `X-Request-Cost-USD` headers —
  not modeled by NeuroLink's catalog schema and not required for the
  integration to work

---

## Quick Start

### 1. Get an API key

1. Visit: https://portal.neuralwatt.com and sign up
2. Add a payment method in **Dashboard > Billing** — new accounts start with
   a $0 balance, and adding a card grants $1.00 in free trial credit (no
   charge is made; the credit is valid for 30 days)
3. Navigate to **Dashboard > API Keys** and create a new key — copy it
   immediately, it is shown in full only once and starts with `sk-`
4. Set `NEURALWATT_API_KEY` in your `.env` file

### 2. Configure

```bash
export NEURALWATT_API_KEY=your-api-key
export NEURALWATT_MODEL=glm-5.3            # optional — overrides the default model
export NEURALWATT_BASE_URL=https://api.neuralwatt.com/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "neuralwatt",
  model: "glm-5.3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider neuralwatt
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "neuralwatt",
  credentials: { neuralwatt: { apiKey: process.env.NEURALWATT_API_KEY } },
});
```

---

## Models

| Model                 | Context | Max output | Vision | $/M in · out · cached    | Notes                                                                                                                                                                             |
| --------------------- | ------- | ---------- | ------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glm-5.3` ⭐          | 1M      | —          | no     | $1.45 / $4.50 / $0.145   | ZhipuAI GLM 5.3 — used in every quickstart code sample; reasoning is mandatory on this model (default effort `max`). Max output tokens undocumented for this model on the roster. |
| `glm-5.3-flash`       | 1M      | —          | yes    | $0.15 / $0.50 / $0.03    | Lighter/cheaper GLM 5.3 sibling; roster-listed only; fallback.                                                                                                                    |
| `qwen-3.8-27b`        | 262K    | 131,072    | yes    | $0.45 / $3.20 / $0.25    | Dense 27B VL model; first entry on the live roster; used as `models.visionModel` (documented image limits: 20 images/request, 200 total).                                         |
| `qwen3.6-35b`         | 262K    | —          | yes    | $0.29 / $1.15 / $0.029   | Roster-listed only; fallback.                                                                                                                                                     |
| `kimi-k2.7-code`      | 262K    | —          | yes    | $0.95 / $4.00 / $0.095   | MoonshotAI's code-oriented Kimi model; roster-listed only; fallback.                                                                                                              |
| `kimi-k3`             | 1M      | —          | yes    | $3.00 / $15.00 / $0.30   | MoonshotAI's general-purpose Kimi model; roster-listed only; fallback.                                                                                                            |
| `deepseek-v4.1-flash` | 1M      | 393,216    | yes    | $0.15 / $0.60 / $0.015   | Roster-listed only; fallback.                                                                                                                                                     |
| `gemma-4-31b`         | 262K    | 16,384     | yes    | $0.144 / $0.42 / $0.0144 | NVIDIA-owned Gemma 4 31B build; roster-listed only; fallback.                                                                                                                     |

Context window shown is each model's own `max_context_length` from the live
roster; the catalog's provider-wide `defaultContextWindow` (1,048,560) and
`defaultMaxOutputTokens` (4,096) apply to any model that doesn't declare its
own value — 4,096 is a **generic placeholder**, not a Neuralwatt-documented
ceiling, since `glm-5.3` (the default model) has no `max_output_tokens` in
its own roster entry.

The live roster carries **21** models in total (Qwen, MoonshotAI Kimi,
ZhipuAI GLM, DeepSeek and an NVIDIA Gemma build); this catalog curates 8 —
one representative per non-`-flex`/non-`-fast` pricing tier per model
family. The `-flex` (discounted async) and `-fast` (lower-latency) pricing
variants seen on the roster (e.g. `glm-5.3-flex`, `qwen3.6-35b-fast`) are not
included as separate catalog entries.

**Fallback order** when the default is unavailable: `glm-5.3-flash` →
`qwen-3.8-27b` → `qwen3.6-35b` → `kimi-k2.7-code` → `kimi-k3` →
`deepseek-v4.1-flash` → `gemma-4-31b`.

---

## Live verification (still needed)

This entry was onboarded **without credentials**, from Neuralwatt's public
documentation and an unauthenticated `GET /v1/models` call only. It is
**docs- and roster-verified, not live-verified**. Before treating it as
fully proven, a follow-up pass with a real API key should run the Tier-2
live-verification steps
([Tier-2 onboarding: live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification)):

- **Auth rejection** — confirm the documented `401`
  `{"error":{"message":"Invalid API key","type":"authentication_error","code":"invalid_api_key"}}`
  shape actually comes back for a bad key.
- **Capability probe** — confirm `tools` actually works for `glm-5.3` (and
  check whether it varies across the roster, per Neuralwatt's own "not all
  models support tool calling" caveat) before ever promoting
  `capabilities.tools` off `"model-dependent"`.
- **Structured output** — Neuralwatt does not document a `response_format`
  parameter at all, despite the roster exposing a `json_mode` capability
  flag. A live probe should establish whether `response_format` is silently
  accepted, ignored, or rejected before `capabilities.structuredOutput` is
  ever set to `true`.
- **Tools + streaming, tools + structured output** — both undocumented and
  unprobed; a combined live request is required before setting either to
  `true`.
- **`evidence.liveMatrix`** — currently `null` in the catalog JSON; fill it
  in once the above is run, per
  `pnpm run verify:provider-onboarding`.

---

## Verification status

This is what the catalog currently records for Neuralwatt:

| Probe                 | Result                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated GET `https://api.neuralwatt.com/v1/models`, HTTP 200, 21 models, 2026-09-28 — credential-free, no key used |
| Auth rejection        | not attempted — this onboarding sent no authenticated or `POST` request to Neuralwatt                                      |
| Live capability sweep | not run (`evidence.liveMatrix: null`) — see [Live verification](#live-verification-still-needed)                           |

---

## Troubleshooting

| Symptom                              | Cause                                                                                                             | Fix                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Invalid Neuralwatt API key`         | `NEURALWATT_API_KEY` unset or wrong                                                                               | Check the key in the portal's Dashboard > API Keys at https://portal.neuralwatt.com                                       |
| Model not found                      | The roster changed since 2026-09-28                                                                               | Pick a current id from the unauthenticated `GET /v1/models` roster                                                        |
| Tool calls silently not made         | The model doesn't support tool calling (varies per model per Neuralwatt's own docs)                               | Check the model's `capabilities.tools` on `GET /v1/models` before relying on tool calling on it                           |
| Structured output not honored        | `response_format` is undocumented on Neuralwatt's chat-completions endpoint                                       | Don't rely on `response_format`; NeuroLink's `coerceJsonToSchema` repair layer is the fallback for `generate({ schema })` |
| Missing energy/cost data in a stream | Comes through as SSE comment lines (`: energy {...}`, `: cost {...}`), which standard SSE/OpenAI-SDK clients drop | Parse the raw stream if you need it; not required for normal generation                                                   |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
