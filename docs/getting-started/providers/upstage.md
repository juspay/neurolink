---
title: Upstage Provider Guide
description: Upstage on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `solar-pro4`
keywords: upstage, solar, openai-compatible, tier 2, provider setup
---

# Upstage Provider Guide

Upstage is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/upstage.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `upstage` (aliases: `solar`)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.upstage.ai/v1`
- **Default model**: `solar-pro4`
- **Models in catalog**: 10
- **Streaming**: supported
- **Tool calling**: supported (native)
- **Structured output**: supported
- **Embeddings**: not supported
- **Billing**: free-tier
- **Key format**: `^up_[A-Za-z0-9]+$`

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.upstage.ai (Google OAuth works)
2. New accounts get a $10 sign-up credit — no payment method required
3. Create an API key under API Keys
4. Set `UPSTAGE_API_KEY` in your .env file

### 2. Configure

```bash
export UPSTAGE_API_KEY=your-api-key
export UPSTAGE_MODEL=solar-pro4      # optional — overrides the default model
export UPSTAGE_BASE_URL=https://api.upstage.ai/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "upstage",
  model: "solar-pro4",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider upstage
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "upstage",
  credentials: { upstage: { apiKey: process.env.UPSTAGE_API_KEY } },
});
```

---

## Models

| Model               | Context | Vision | $/M in · out  | Notes                                                                                                                              |
| ------------------- | ------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `solar-pro4` ⭐     | 512K    | no     | $0.3 / $1.2   | Solar Pro 4; 512K context, up to 128K output tokens; agentic flagship for tool calling, terminal tasks and long-document reasoning |
| `solar-pro4-260806` | 512K    | no     | $0.3 / $1.2   | Pinned dated snapshot of Solar Pro 4 (2026-08-06 build) — the id the solar-pro4 alias currently resolves to                        |
| `solar-pro3`        | 512K    | no     | $0.15 / $0.6  | Solar Pro 3; drop-in replacement for Solar Pro 2 with the same API interface, throughput and latency                               |
| `solar-pro3-260323` | 512K    | no     | $0.15 / $0.6  | Pinned dated snapshot of Solar Pro 3 (2026-03-23 build)                                                                            |
| `solar-pro2`        | 512K    | no     | $0.15 / $0.6  | Solar Pro 2; 31B-parameter model with an optional Reasoning Mode                                                                   |
| `solar-pro2-251215` | 512K    | no     | $0.15 / $0.6  | Pinned dated snapshot of Solar Pro 2 (2025-12-15 build)                                                                            |
| `solar-mini`        | 512K    | no     | $0.15 / $0.15 | Solar Mini; small, fast model for lightweight reasoning and cost-efficient tasks                                                   |
| `solar-mini-250422` | 512K    | no     | $0.15 / $0.15 | Pinned dated snapshot of Solar Mini (2025-04-22 build)                                                                             |
| `syn-pro`           | 512K    | no     | —             | Syn Pro; Upstage's Japan-focused LLM                                                                                               |
| `syn-pro-251021`    | 512K    | no     | —             | Pinned dated snapshot of Syn Pro (2025-10-21 build)                                                                                |

**Fallback order** when the default is unavailable: `solar-pro3` → `solar-mini`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Upstage:

| Probe                 | Result                                             |
| --------------------- | -------------------------------------------------- |
| Roster                | authenticated GET /v1/models, HTTP 200, 2026-09-03 |
| Auth rejection        | HTTP 401 `invalid_api_key`, 2026-09-03             |
| Live capability sweep | **not run**                                        |

> ⚠️ No live capability sweep is recorded for Upstage. The roster and auth
> behaviour were verified against the real API on the date above, but the
> capability flags come from the catalog declaration rather than from a
> measured end-to-end run. Treat them as the provider's stated behaviour.

---

## Troubleshooting

| Symptom                   | Cause                               | Fix                                                               |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `Invalid Upstage API key` | `UPSTAGE_API_KEY` unset or wrong    | Check the key at https://console.upstage.ai/api-keys              |
| Model not found           | The roster changed since 2026-09-03 | Pick a current id; catalog providers retire models without notice |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
