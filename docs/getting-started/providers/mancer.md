---
title: Mancer Provider Guide
description: Mancer on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek-v4-flash`
keywords: mancer, mancer-tech, openai-compatible, tier 2, provider setup
---

# Mancer Provider Guide

Mancer is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/mancer.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `mancer` (aliases: `mancer-tech`)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://neuro.mancer.tech/oai/v1`
- **Default model**: `deepseek-v4-flash`
- **Models in catalog**: 10
- **Streaming**: supported
- **Tool calling**: **not supported**
- **Structured output**: supported
- **Embeddings**: not supported
- **Billing**: free-tier
- **Key format**: `^mcr_[A-Za-z0-9]+$`

---

## Quick Start

### 1. Get an API key

1. Visit: https://mancer.tech/dashboard and sign in
2. Create an API key (prefix mcr\_)
3. Without credits only the free model 'mytholite' answers; every other model returns 402 until you add credits at https://mancer.tech/pricing
4. Set `MANCER_API_KEY` in your .env file

### 2. Configure

```bash
export MANCER_API_KEY=your-api-key
export MANCER_MODEL=deepseek-v4-flash      # optional — overrides the default model
export MANCER_BASE_URL=https://neuro.mancer.tech/oai/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "mancer",
  model: "deepseek-v4-flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider mancer
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "mancer",
  credentials: { mancer: { apiKey: process.env.MANCER_API_KEY } },
});
```

---

## Models

| Model                    | Context | Vision | $/M in · out  | Notes                                                                                                                                                                                                                                |
| ------------------------ | ------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mythomax`               | 8K      | no     | $0.14 / $0.24 | MythoMax (LLaMA 2, Simplified Alpaca format) — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                                                           |
| `deepseek-v4-flash` ⭐   | 1M      | no     | $0.07 / $0.2  | DeepSeek V4 Flash — Mancer's flagship general model; paid credits required — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                             |
| `deepseek-v4-flash-0731` | 1M      | no     | $0.07 / $0.2  | DeepSeek V4 Flash, 2026-07-31 snapshot; paid credits required — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                                          |
| `mytholite`              | 3K      | no     | $0 / $0       | MythoLite — Mancer's free demo model (2,560-token context, 150-token completions, Simplified Alpaca format); the only model usable with a zero balance — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03 |
| `remm-slerp`             | 6K      | no     | $0.14 / $0.26 | ReMM-SLERP (Simplified Alpaca format) — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                                                                  |
| `magnum-72b-v4`          | 32K     | no     | $1 / $2       | Magnum 72B v4 (ChatML format) — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                                                                          |
| `glm-4.7`                | 128K    | no     | $0.28 / $1    | GLM-4.7 — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                                                                                                |
| `gpt-oss-120b`           | 128K    | no     | $0.022 / $0.2 | GPT-OSS 120B — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                                                                                           |
| `weaver-alpha`           | 8K      | no     | $0.16 / $0.3  | Weaver Alpha (Simplified Alpaca format) — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                                                                |
| `dans-pe-1.3-24b`        | 32K     | no     | $0.2 / $0.8   | Dan's PersonalityEngine 1.3 24B — pricing and limits from the authenticated /oai/v1/models roster, 2026-09-03                                                                                                                        |

**Fallback order** when the default is unavailable: `deepseek-v4-flash` → `gpt-oss-120b`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Mancer:

| Probe                 | Result                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                | authenticated GET /oai/v1/models; full response retained as evidence/mancer-roster-authenticated.json in the campaign scratchpad and every catalog price/limit machine-checked against it (Mancer re-prices — gpt-oss-120b input moved 0.024 → 0.022 within the day), HTTP 200, 2026-09-03 |
| Auth rejection        | HTTP 401, 2026-09-03                                                                                                                                                                                                                                                                       |
| Live capability sweep | 2026-09-03 — 18-probe harness on the free model mytholite: roster, chat, max_completion_tokens, system role, content parts, sampling params, SSE stream (usage chunk + [DONE]), json_schema (valid JSON matching schema) and json_object                                                   |

---

## Troubleshooting

| Symptom                  | Cause                               | Fix                                                                                                                        |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Invalid Mancer API key` | `MANCER_API_KEY` unset or wrong     | Check the key at https://mancer.tech/dashboard                                                                             |
| Model not found          | The roster changed since 2026-09-03 | Pick a current id; catalog providers retire models without notice                                                          |
| Tools silently absent    | Mancer declares `tools: false`      | Use a tool-capable provider for agentic work — see [provider capabilities](/docs/reference/provider-feature-compatibility) |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
