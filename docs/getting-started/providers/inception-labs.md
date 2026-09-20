---
title: Inception Labs Provider Guide
description: Inception Labs on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `mercury-2`
keywords: inception-labs, inception, mercury, openai-compatible, tier 2, provider setup
---

# Inception Labs Provider Guide

Inception Labs is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/inception-labs.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `inception-labs` (aliases: `inception`, `mercury`)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.inceptionlabs.ai/v1`
- **Default model**: `mercury-2`
- **Models in catalog**: 1
- **Streaming**: supported
- **Tool calling**: supported (native)
- **Structured output**: supported
- **Embeddings**: not supported
- **Billing**: free-tier
- **Key format**: `^sk_[A-Za-z0-9_-]+$`

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.inceptionlabs.ai and sign in (Google OAuth works)
2. New accounts get 100M free tokens with no card required
3. Create an API key under Dashboard -> API Keys
4. Set `INCEPTION_LABS_API_KEY` in your .env file

### 2. Configure

```bash
export INCEPTION_LABS_API_KEY=your-api-key
export INCEPTION_LABS_MODEL=mercury-2      # optional — overrides the default model
export INCEPTION_LABS_BASE_URL=https://api.inceptionlabs.ai/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "inception-labs",
  model: "mercury-2",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider inception-labs
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "inception-labs",
  credentials: {
    inceptionLabs: { apiKey: process.env.INCEPTION_LABS_API_KEY },
  },
});
```

---

## Models

| Model          | Context | Vision | $/M in · out  | Notes                                                                                                                     |
| -------------- | ------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `mercury-2` ⭐ | 125K    | no     | $0.25 / $0.75 | Mercury 2, Inception's enterprise diffusion LLM (dLLM); reasoning, tool use, structured output; 128K context, 1000+ tok/s |

**Fallback order** when the default is unavailable: `mercury-2`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Inception Labs:

| Probe                 | Result                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | authenticated GET /v1/models, HTTP 200, 2026-09-03                                                                                                                                                                                        |
| Auth rejection        | HTTP 401 `invalid_api_key`, 2026-09-03                                                                                                                                                                                                    |
| Live capability sweep | 2026-09-03 — Full capability sweep on mercury-2: chat, stream, system_role, content_text_parts, sampling_params, tools, tools_stream, tools_roundtrip_null, tool_choice_without_tools, json_object, json_schema and tools_plus_schema all |

---

## Troubleshooting

| Symptom                          | Cause                                   | Fix                                                                   |
| -------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `Invalid Inception Labs API key` | `INCEPTION_LABS_API_KEY` unset or wrong | Check the key at https://platform.inceptionlabs.ai/dashboard/api-keys |
| Model not found                  | The roster changed since 2026-09-03     | Pick a current id; catalog providers retire models without notice     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
