---
title: Synthetic Provider Guide
description: Synthetic on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `syn:large:text`
keywords: synthetic, synthetic.new, openai-compatible, tier 2, provider setup, deepseek, kimi, glm
---

# Synthetic Provider Guide

Synthetic is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks declared, so its entire integration is one JSON file
(`src/lib/providers/catalog/synthetic.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status**: this entry is **docs- and roster-verified, not yet
> live-verified**. Every model id, context window, output ceiling and price
> below comes from an unauthenticated `GET /openai/v1/models` call plus the
> vendor's own pricing page and LiteLLM's third-party provider page — no API
> key was used or is required to onboard this entry. Nobody has yet run a
> live capability sweep (chat, streaming, tool calls, structured output)
> against Synthetic with a real key; `evidence.liveMatrix` is `null` until
> that happens. Treat `capabilities.tools`, `.structuredOutput` and
> `.thinking` as "documented by the vendor," not "wire-proven."

---

## Key Facts

- **Provider id**: `synthetic`
- **Protocol**: OpenAI-compatible (`/chat/completions` — the only operation
  LiteLLM's provider page lists for Synthetic)
- **Base URL**: `https://api.synthetic.new/openai/v1`
- **Default model**: `syn:large:text` (`deepseek-ai/DeepSeek-V4.1-Flash`)
- **Models in catalog**: 11 ids covering 7 unique always-on models (short
  `syn:*` aliases and full Hugging Face weight ids both resolve)
- **Streaming**: documented (vendor docs show a streaming SDK example)
- **Tool calling**: documented — every model on the live roster lists `tools`
  in `supported_features`
- **Structured output**: documented — every model lists `json_mode` and
  `structured_outputs` in `supported_features`. Tools + structured output
  _together_ has not been probed, so `structuredOutputWithTools` is `false`
  until a live combined request confirms it.
- **Reasoning / thinking**: documented — every model lists `reasoning` in
  `supported_features` with an explicit `reasoning_parameters.efforts` list
  (e.g. `none`/`low`/`high`/`xhigh`/`max`)
- **Embeddings**: not exposed through this catalog entry. Synthetic's
  pricing page separately lists an included embedding model
  (`hf:nomic-ai/nomic-embed-text-v1.5`), but NeuroLink's `embed()` /
  `embedMany()` surface is currently wired only for OpenAI, Google AI
  Studio, Google Vertex and Amazon Bedrock — not generic Tier-2 catalog
  providers — so `capabilities.embeddings` is `false` here regardless.
- **Billing**: no free tier — flat-fee subscription ($1/day or $30/month,
  500 requests/5hr) or enterprise usage-based pricing
- **Key format**: none documented

---

## Quick Start

### 1. Get an API key

1. Visit: https://synthetic.new and choose Sign up (or Log in if you already have an account)
2. Subscribe to a Pack ($1/day or $30/month, 500 requests/5hr per the pricing page) or set up enterprise usage-based billing — Synthetic has no free tier or keyless trial
3. Generate an API key from your account dashboard
4. Set `SYNTHETIC_API_KEY` in your .env file

### 2. Configure

```bash
export SYNTHETIC_API_KEY=your-api-key
export SYNTHETIC_MODEL=syn:large:text      # optional — overrides the default model
export SYNTHETIC_BASE_URL=https://api.synthetic.new/openai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "synthetic",
  model: "syn:large:text",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider synthetic
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "synthetic",
  credentials: { synthetic: { apiKey: process.env.SYNTHETIC_API_KEY } },
});
```

---

## Models

| Model                                               | Context | Max out | Vision | $/M in · out · cached-in | Notes                                                                                                           |
| --------------------------------------------------- | ------- | ------- | ------ | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `syn:large:text` ⭐                                 | 512K    | 64K     | yes    | $0.60 / $1.20 / $0.03    | Recommended — alias for `deepseek-ai/DeepSeek-V4.1-Flash`. Vendor: "an efficient near-Fable model with vision." |
| `syn:small:text`                                    | 192K    | 64K     | no     | $0.10 / $0.50 / $0.02    | Alias for `zai-org/GLM-4.7-Flash` — smaller/faster, ~30B class; text-only input.                                |
| `syn:large:vision`                                  | 512K    | 64K     | yes    | $3.00 / $15.00 / $0.45   | Alias for `moonshotai/Kimi-K3` — 2.8T-parameter flagship; the most expensive model in the roster.               |
| `syn:small:vision`                                  | 256K    | 64K     | yes    | $0.45 / $2.20 / $0.09    | Alias for `Qwen/Qwen3.8-27B` — small coding + vision model.                                                     |
| `hf:zai-org/GLM-5.3-Flash`                          | 512K    | 64K     | yes    | $0.15 / $0.50 / $0.04    | No `syn:` short alias. Vendor: "an extremely efficient, Opus-4.8-equivalent model with vision."                 |
| `hf:openai/gpt-oss-120b`                            | 128K    | 64K     | no     | $0.10 / $0.10 / $0.02    | OpenAI's open-weight gpt-oss-120b; strong reasoning + agentic use.                                              |
| `hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4` | 256K    | 64K     | no     | $0.30 / $1.00 / $0.06    | Fast 120B model, good for coding agents.                                                                        |
| `hf:deepseek-ai/DeepSeek-V4.1-Flash`                | 512K    | 64K     | yes    | $0.60 / $1.20 / $0.03    | Same underlying model as `syn:large:text`, addressed by its full weights id.                                    |
| `hf:moonshotai/Kimi-K3`                             | 512K    | 64K     | yes    | $3.00 / $15.00 / $0.45   | Same underlying model as `syn:large:vision`.                                                                    |
| `hf:Qwen/Qwen3.8-27B`                               | 256K    | 64K     | yes    | $0.45 / $2.20 / $0.09    | Same underlying model as `syn:small:vision`.                                                                    |
| `hf:zai-org/GLM-4.7-Flash`                          | 192K    | 64K     | no     | $0.10 / $0.50 / $0.02    | Same underlying model as `syn:small:text`.                                                                      |

All 11 ids and their pricing/context/output figures come directly from the
unauthenticated `GET /openai/v1/models` response (HTTP 200, 2026-09-28); the
`$/M` figures are the roster's per-token USD prices multiplied by 1,000,000.
`syn:*` short aliases and their `hf:*` full-weights-id equivalents are the
same served model with identical specs and pricing — both forms are valid
values for `model`, so both are kept in the catalog.

**Fallback order** when the default is unavailable: `syn:small:text` →
`syn:large:vision` → `syn:small:vision` → `hf:zai-org/GLM-5.3-Flash` →
`hf:openai/gpt-oss-120b` → `hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4`
→ `hf:deepseek-ai/DeepSeek-V4.1-Flash` → `hf:moonshotai/Kimi-K3` →
`hf:Qwen/Qwen3.8-27B` → `hf:zai-org/GLM-4.7-Flash`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Synthetic — **all credential-free**:

| Probe                  | Result                                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                 | unauthenticated `GET /openai/v1/models`, HTTP 200, 11 models, 2026-09-28. No API key used or required for this endpoint.                                                                                                                |
| Billing                | unauthenticated `GET https://synthetic.new/pricing`, HTTP 200, 2026-09-28 — no free tier; $1/day or $30/month subscription pack (500 req/5hr), or enterprise usage-based pricing.                                                       |
| Third-party wire check | LiteLLM's Synthetic provider page confirms base URL `https://api.synthetic.new/openai/v1`, env var `SYNTHETIC_API_KEY`, and `/chat/completions` as the only supported operation.                                                        |
| Live capability sweep  | **Not yet run.** `evidence.liveMatrix` is `null`. Tool calling, structured output, streaming and the tools+schema combination are documented by the vendor's own `supported_features` roster field, not wire-proven against a real key. |

Because no live key was used, `capabilities.structuredOutputWithTools` is
`false` per Tier-2 policy — a documented individual capability is not
evidence for the combined one. A future pass with a real
`SYNTHETIC_API_KEY` should run the live matrix
(`npx tsx test/continuous-test-suite-provider-matrix.ts --provider=synthetic`)
and update `evidence.liveMatrix` accordingly.

---

## Troubleshooting

| Symptom                                  | Cause                                                                                                | Fix                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Auth error on first request              | No documented auth-error shape yet (no live probe)                                                   | Check `SYNTHETIC_API_KEY` is set and valid; see https://synthetic.new for key management |
| Model not found                          | The roster changed since 2026-09-28                                                                  | Pick a current id from the unauthenticated `GET /openai/v1/models` roster                |
| No free tier                             | Synthetic requires a paid Pack or usage-based billing                                                | Subscribe at https://synthetic.new before making live calls                              |
| Structured output + tools together fails | Not yet probed combined; declared unsupported (`structuredOutputWithTools: false`) until proven live | Send tools and `response_format` in separate requests until this is live-verified        |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
