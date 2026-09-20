---
title: GMI Cloud Provider Guide
description: GMI Cloud on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `MiniMaxAI/MiniMax-M3`
keywords: gmicloud, gmi-cloud, openai-compatible, tier 2, provider setup
---

# GMI Cloud Provider Guide

GMI Cloud is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/gmicloud.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `gmicloud` (aliases: `gmi-cloud`)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.gmi-serving.com/v1`
- **Default model**: `MiniMaxAI/MiniMax-M3`
- **Models in catalog**: 1
- **Streaming**: supported
- **Tool calling**: supported (native)
- **Structured output**: supported
- **Embeddings**: not supported
- **Billing**: free-tier
- **Key format**: `^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$`

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.gmicloud.ai
2. Sign in and select the Inference service
3. Create an API key; check Console → Inference → Model Hub for current model pricing
4. Set `GMICLOUD_API_KEY` in your .env file

### 2. Configure

```bash
export GMICLOUD_API_KEY=your-api-key
export GMICLOUD_MODEL=MiniMaxAI/MiniMax-M3      # optional — overrides the default model
export GMICLOUD_BASE_URL=https://api.gmi-serving.com/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "gmicloud",
  model: "MiniMaxAI/MiniMax-M3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider gmicloud
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "gmicloud",
  credentials: { gmicloud: { apiKey: process.env.GMICLOUD_API_KEY } },
});
```

---

## Models

| Model                     | Context | Vision | $/M in · out | Notes                                              |
| ------------------------- | ------- | ------ | ------------ | -------------------------------------------------- |
| `MiniMaxAI/MiniMax-M3` ⭐ | 1M      | no     | —            | MiniMaxAI/MiniMax-M3 — live GMI Cloud-probed model |

**Fallback order** when the default is unavailable: `MiniMaxAI/MiniMax-M3`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for GMI Cloud:

| Probe                 | Result                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | authenticated GET /v1/models, HTTP 200, 2026-09-03                                                                                                                                                                                        |
| Auth rejection        | HTTP 401, 2026-09-03                                                                                                                                                                                                                      |
| Live capability sweep | 2026-09-03 — MiniMax-M3 accepted max_completion_tokens=524288 and rejected 1048576 with an explicit 524288 limit. Structured output: the endpoint ignores response_format (json_schema and json_object both return prose with no prompt h |

---

## Troubleshooting

| Symptom                     | Cause                               | Fix                                                               |
| --------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `Invalid GMI Cloud API key` | `GMICLOUD_API_KEY` unset or wrong   | Check the key at https://console.gmicloud.ai                      |
| Model not found             | The roster changed since 2026-09-03 | Pick a current id; catalog providers retire models without notice |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
