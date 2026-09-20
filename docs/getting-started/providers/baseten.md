---
title: Baseten Provider Guide
description: Baseten on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `zai-org/GLM-5.3-Flash`
keywords: baseten, openai-compatible, tier 2, provider setup
---

# Baseten Provider Guide

Baseten is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/baseten.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `baseten`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://inference.baseten.co/v1`
- **Default model**: `zai-org/GLM-5.3-Flash`
- **Models in catalog**: 16
- **Streaming**: supported
- **Tool calling**: supported (native)
- **Structured output**: supported
- **Embeddings**: not supported
- **Billing**: free-tier

---

## Quick Start

### 1. Get an API key

1. Visit: https://app.baseten.co/ and sign in or create a workspace
2. Review the current Baseten billing and credit terms in the console before making requests
3. Create a personal API key in the Baseten console
4. Set `BASETEN_API_KEY` in your .env file

### 2. Configure

```bash
export BASETEN_API_KEY=your-api-key
export BASETEN_MODEL=zai-org/GLM-5.3-Flash      # optional — overrides the default model
export BASETEN_BASE_URL=https://inference.baseten.co/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "baseten",
  model: "zai-org/GLM-5.3-Flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider baseten
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "baseten",
  credentials: { baseten: { apiKey: process.env.BASETEN_API_KEY } },
});
```

---

## Models

| Model                                      | Context | Vision | $/M in · out  | Notes                                                                                              |
| ------------------------------------------ | ------- | ------ | ------------- | -------------------------------------------------------------------------------------------------- |
| `openai/gpt-oss-120b`                      | 125K    | no     | $0.1 / $0.5   | OpenAI GPT-OSS 120B; general-purpose model with controllable reasoning                             |
| `zai-org/GLM-4.7`                          | 195K    | no     | $0.6 / $2.2   | GLM 4.7; fast general-purpose model with 200K context and enhanced tool use                        |
| `moonshotai/Kimi-K2.6`                     | 256K    | no     | $0.95 / $4    | Kimi K2.6; agentic and coding model for multi-step reasoning and tool use                          |
| `deepseek-ai/DeepSeek-V4-Pro`              | 1M      | no     | $1.74 / $3.48 | DeepSeek V4 Pro; 1M-context mixture-of-experts model for agentic workflows and coding              |
| `nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B` | 198K    | no     | $0.6 / $2.4   | NVIDIA Nemotron 3 Ultra; flagship reasoning and non-reasoning model for code and agentic execution |
| `zai-org/GLM-5.2`                          | 1M      | no     | $1.4 / $4.4   | GLM 5.2; 1M-context reasoning model                                                                |
| `moonshotai/Kimi-K2.7-Code`                | 256K    | no     | $0.95 / $4    | Kimi K2.7 Code; model for complex coding, code reasoning and long-horizon development              |
| `deepseek-ai/DeepSeek-V4-Flash-0731`       | 1M      | no     | $0.13 / $0.26 | DeepSeek V4 Flash 0731; fast, low-cost 1M-context mixture-of-experts model                         |
| `thinkingmachines/inkling`                 | 1M      | no     | $1 / $4.05    | Thinking Machines Inkling; 1M-context reasoning model                                              |
| `zai-org/GLM-5.2-Fast`                     | 1M      | no     | $2.1 / $6.6   | GLM 5.2 Fast; 1M-context model                                                                     |
| `moonshotai/Kimi-K3`                       | 1M      | no     | $3 / $15      | Kimi K3; 1M-context model                                                                          |
| `thinkingmachines/inkling-small`           | 1M      | no     | $0.5 / $1.2   | Thinking Machines Inkling Small; 1M-context reasoning model                                        |
| `deepseek-ai/DeepSeek-V4-Pro-0813`         | 1M      | no     | $1.32 / $3.96 | DeepSeek V4 Pro 0813; dated 1M-context mixture-of-experts model for agentic workflows and coding   |
| `zai-org/GLM-5.3-Flash` ⭐                 | 1M      | yes    | $0.15 / $0.5  | GLM 5.3 Flash; 1M-context reasoning model with live-verified image input                           |
| `zai-org/GLM-5.3`                          | 1M      | no     | $1.4 / $4.4   | GLM 5.3; 1M-context reasoning model                                                                |
| `zai-org/GLM-5.3-Fast`                     | 1M      | yes    | $2.1 / $6.6   | GLM 5.3 Fast; 1M-context reasoning model with image input                                          |

**Fallback order** when the default is unavailable: `zai-org/GLM-5.3-Flash` → `zai-org/GLM-5.3` → `zai-org/GLM-5.2`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Baseten:

| Probe                 | Result                                             |
| --------------------- | -------------------------------------------------- |
| Roster                | authenticated GET /v1/models, HTTP 200, 2026-09-03 |
| Auth rejection        | HTTP 403, 2026-09-03                               |
| Live capability sweep | **not run**                                        |

> ⚠️ No live capability sweep is recorded for Baseten. The roster and auth
> behaviour were verified against the real API on the date above, but the
> capability flags come from the catalog declaration rather than from a
> measured end-to-end run. Treat them as the provider's stated behaviour.

---

## Troubleshooting

| Symptom                   | Cause                               | Fix                                                               |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `Invalid Baseten API key` | `BASETEN_API_KEY` unset or wrong    | Check the key at https://app.baseten.co/                          |
| Model not found           | The roster changed since 2026-09-03 | Pick a current id; catalog providers retire models without notice |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
