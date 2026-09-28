---
title: Inference.net Provider Guide
description: Inference.net on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `glm-5.2`
keywords: inference.net, inference-net, openai-compatible, tier 2, provider setup, gateway
---

# Inference.net Provider Guide

Inference.net is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/inference-net.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** It was onboarded credential-free — built entirely from the
> vendor's public documentation and an unauthenticated `GET /v1/models` call,
> with no API key ever created or used. No chat/stream/tool/structured-output
> request has been made against the live API yet. `evidence.liveMatrix` is
> `null` until someone runs the live capability sweep in
> [Live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification)
> with a real key.

---

## Key Facts

- **Provider id**: `inference-net`
- **Protocol**: OpenAI-compatible (`/chat/completions`), `Authorization: Bearer <key>`
- **Base URL**: `https://api.inference.net/v1`
- **Default model**: `glm-5.2` — the exact model used in the vendor's own API
  quickstart code sample
- **Models in catalog**: 8 (curated slice of a live 63-model roster spanning
  Claude, GPT, Gemini, DeepSeek, GLM, Kimi, Llama, Qwen, Gemma, Nemotron and
  Inference.net's own Schematron models)
- **Streaming**: documented (`stream: true` in the quickstart example)
- **Tool calling**: documented (`tools` request parameter, "function
  definitions for function calling") — **not** live-probed
- **Structured output**: documented (`response_format` accepts `json_object`
  or a JSON schema) — **not** live-probed
- **Embeddings**: not documented
- **Billing**: free-tier — pay-as-you-go, $0-usage entry tier (1M gateway
  requests/month, 30 req/min)
- **Key format**: none declared
- **Env var**: `INFERENCE_API_KEY` (the vendor's own docs use this exact name
  in their quickstart code, which is why the catalog sets `wire.envOverrides`
  instead of the `INFERENCE_NET_API_KEY` name NeuroLink's naming convention
  would otherwise derive from the `inference-net` provider id)

---

## Quick Start

### 1. Get an API key

1. Visit: https://inference.net/register/ and sign up
2. Create an Inference.net project API key from the dashboard (this is the
   gateway key — do not confuse it with a third-party provider key used only
   for the separate "proxy mode")
3. New accounts start on a pay-as-you-go, $0-usage tier; confirm current
   terms at https://inference.net/pricing before heavy use
4. Set `INFERENCE_API_KEY` in your .env file

### 2. Configure

```bash
export INFERENCE_API_KEY=your-api-key
export INFERENCE_NET_MODEL=glm-5.2                        # optional — overrides the default model
export INFERENCE_NET_BASE_URL=https://api.inference.net/v1 # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "inference-net",
  model: "glm-5.2",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider inference-net
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "inference-net",
  credentials: { "inference-net": { apiKey: process.env.INFERENCE_API_KEY } },
});
```

---

## Models

| Model                    | Context | Vision | $/M in · out · cache         | Notes                                                                                                                      |
| ------------------------ | ------- | ------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `glm-5.2` ⭐             | 1M      | no     | $1.30 / $4.40 (cached $0.20) | Recommended — used in the vendor's own quickstart request example; native Zhipu GLM-5.2, hosted directly by Inference.net. |
| `glm-5.3`                | 1M      | no     | $0.90 / $3.00 (cached $0.15) | Newer GLM generation; one of the few roster models whose live entry lists chat + responses + messages endpoint support.    |
| `glm-5.3-flash`          | 1M      | yes    | $0.09 / $0.28 (cached $0.02) | Cheapest model in this entry; the only one of these 8 whose live roster entry documents image + video input.               |
| `llama-3.3-70b-instruct` | 131K    | no     | $0.13 / $0.40                | Meta Llama 3.3 70B Instruct, open-weight; widely-recognized baseline fallback.                                             |
| `deepseek-v3.2`          | 164K    | no     | $0.70 / $2.00 (cached $0.35) | DeepSeek V3.2, open-weight fallback.                                                                                       |
| `gpt-4.1-mini`           | 1M      | yes    | $0.40 / $1.60 (cached $0.10) | OpenAI GPT-4.1 mini, reachable through Inference.net's gateway.                                                            |
| `gemini-2.5-flash`       | 1M      | yes    | $0.30 / $2.50 (cached $0.03) | Google Gemini 2.5 Flash, reachable through the gateway.                                                                    |
| `claude-haiku-4-5`       | 200K    | yes    | $1.00 / $5.00 (cached $0.10) | Anthropic Claude Haiku 4.5, reachable through the gateway; Claude-family entries list only the "messages" endpoint.        |

Context, pricing and vision (`input_modalities`) for every row above were read
directly from the live, unauthenticated `GET https://api.inference.net/v1/models`
response on 2026-09-28 (HTTP 200, 63 models total on the roster). This catalog
entry lists a curated 8-model slice of that roster, not all 63 — the full list
spans Claude, GPT, Gemini, DeepSeek, GLM, Kimi, Llama, Qwen, Gemma, Nemotron
and Inference.net's own Schematron structured-extraction models.

**Fallback order** when the default is unavailable: `glm-5.3` →
`glm-5.3-flash` → `llama-3.3-70b-instruct` → `deepseek-v3.2` → `gpt-4.1-mini`
→ `gemini-2.5-flash` → `claude-haiku-4-5`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Inference.net today:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | **unauthenticated** GET `/v1/models`, HTTP 200, 63 models, 2026-09-28. No API key was created or used.                                                                                                                                                                                                                                    |
| Auth rejection        | Not probed — a real or invalid-key request would be an authenticated/POST call, which credential-free onboarding does not make. `errorRules` declares a conventional HTTP 401 → authentication mapping based on the vendor's "OpenAI-compatible" framing, not a live 401.                                                                 |
| Capability probes     | Not run. `tools` and `response_format` are asserted **only** because the vendor's own API reference documents them as request parameters (https://docs.inference.net/api/api-quickstart, retrieved 2026-09-28); no combined tools+schema request was ever sent, so `structuredOutputWithTools` and `toolsWithStreaming` are both `false`. |
| Live capability sweep | **Not run.** `evidence.liveMatrix` is `null`. A future pass with a real key must run the live matrix per [Live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification) before this line is filled in.                                                                                                      |

Because no live request has ever been sent, every capability flag above
should be read as "documented by the vendor," not "proven to work." NeuroLink's
generic conflict-retry and JSON-repair layers are the intended safety net if a
documented capability turns out to behave differently once probed live.

---

## Troubleshooting

| Symptom                                 | Cause                                                             | Fix                                                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid Inference.net API key`         | `INFERENCE_API_KEY` unset or wrong                                | Check the key in the Inference.net dashboard: https://inference.net/register/                                                                                                                                 |
| Model not found                         | The roster changed since 2026-09-28                               | Pick a current id from the live `GET /v1/models` roster                                                                                                                                                       |
| Key rejected even though it looks right | The gateway key and a provider key (for "proxy mode") got swapped | Only the Inference.net project key goes in `INFERENCE_API_KEY`; a provider key (e.g. an OpenAI key) is only for the separate `x-inference-provider-api-key` proxy-mode header, not used by this catalog entry |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
