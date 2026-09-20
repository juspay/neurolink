---
title: API Route Provider Guide
description: API Route on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `claude-sonnet-4-6`
keywords: api-route, apiroute, openai-compatible, tier 2, provider setup
---

# API Route Provider Guide

API Route is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/api-route.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `api-route` (aliases: `apiroute`)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://global.api-route.com/v1`
- **Default model**: `claude-sonnet-4-6`
- **Models in catalog**: 8
- **Streaming**: supported
- **Tool calling**: supported (native)
- **Structured output**: supported
- **Embeddings**: not supported
- **Billing**: free-tier

---

## Quick Start

### 1. Get an API key

1. Visit: https://api-route.com and create an account
2. Generate an API key in your console / dashboard
3. Set `API_ROUTE_API_KEY` in your .env file

### 2. Configure

```bash
export API_ROUTE_API_KEY=your-api-key
export API_ROUTE_MODEL=claude-sonnet-4-6      # optional — overrides the default model
export API_ROUTE_BASE_URL=https://global.api-route.com/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "api-route",
  model: "claude-sonnet-4-6",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider api-route
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "api-route",
  credentials: { apiRoute: { apiKey: process.env.API_ROUTE_API_KEY } },
});
```

---

## Models

| Model                  | Context | Vision | $/M in · out | Notes                                                                                      |
| ---------------------- | ------- | ------ | ------------ | ------------------------------------------------------------------------------------------ |
| `claude-sonnet-4-6` ⭐ | 1M      | yes    | —            | Claude Sonnet 4.6 — flagship model with 1M context, tool calling, and multimodal vision    |
| `claude-haiku-4-5`     | 195K    | yes    | —            | Claude Haiku 4.5 — fast, high-efficiency model with 200K context, tool calling, and vision |
| `deepseek-v4-flash`    | 1M      | no     | —            | DeepSeek V4 Flash — fast, cost-effective reasoning model with 1M context                   |
| `deepseek-v4-pro`      | 1M      | no     | —            | DeepSeek V4 Pro — powerful reasoning model with 1M context                                 |
| `gemini-3.8-flash`     | 1M      | yes    | —            | Gemini 3.8 Flash — high-speed multimodal model supporting image input and streaming        |
| `qwen3.8-flash`        | 125K    | no     | —            | Qwen 3.8 Flash — versatile, fast model for general instruction and coding tasks            |
| `kimi-k2.7-code`       | 250K    | no     | —            | Kimi K2.7 Code — specialized for coding and multi-step reasoning                           |
| `glm-5.3-flash`        | 125K    | no     | —            | GLM 5.3 Flash — lightweight, fast conversational and instruction-following model           |

**Fallback order** when the default is unavailable: `claude-haiku-4-5` → `deepseek-v4-flash` → `gemini-3.8-flash`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for API Route:

| Probe                 | Result                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | authenticated GET /v1/models, HTTP 200, 2026-09-17                                                                                                                                                                                        |
| Auth rejection        | HTTP 401, 2026-09-17                                                                                                                                                                                                                      |
| Live capability sweep | 2026-09-17 — Verified live against https://global.api-route.com/v1: GET /v1/models returned 70 models. Chat completions, streaming, function calling, streamed function calling, and structured JSON output (json_object and json_schema) |

---

## Troubleshooting

| Symptom                     | Cause                               | Fix                                                               |
| --------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `Invalid API Route API key` | `API_ROUTE_API_KEY` unset or wrong  | Check the key at https://api-route.com                            |
| Model not found             | The roster changed since 2026-09-17 | Pick a current id; catalog providers retire models without notice |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
