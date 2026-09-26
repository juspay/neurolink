---
title: Novita AI Provider Guide
description: Novita AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `zai-org/glm-5.3-flash`
keywords: novita, novita ai, openai-compatible, tier 2, provider setup, glm
---

# Novita AI Provider Guide

Novita AI is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/novita.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `novita`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.novita.ai/openai/v1`
- **Default model**: `zai-org/glm-5.3-flash`
- **Models in catalog**: 5
- **Streaming**: supported
- **Tool calling**: supported (native)
- **Structured output**: supported, **including together with tool calling in
  the same request** — Novita is verified to accept `tools` and
  `response_format` at once, unlike several sibling catalog providers.
- **Embeddings**: not supported
- **Billing**: free-tier
- **Key format**: keys match `^sk_[A-Za-z0-9_-]+$`

---

## Quick Start

### 1. Get an API key

1. Visit: https://novita.ai/settings/key-management and sign in
2. Generate an API key (it will start with `sk_`)
3. Set `NOVITA_API_KEY` in your .env file

### 2. Configure

```bash
export NOVITA_API_KEY=sk_your-api-key
export NOVITA_MODEL=zai-org/glm-5.3-flash      # optional — overrides the default model
export NOVITA_BASE_URL=https://api.novita.ai/openai/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "novita",
  model: "zai-org/glm-5.3-flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider novita
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "novita",
  credentials: { novita: { apiKey: process.env.NOVITA_API_KEY } },
});
```

---

## Models

| Model                               | Context | Vision | $/M in · out                   | Notes                                                                                                         |
| ----------------------------------- | ------- | ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `zai-org/glm-5.3-flash` ⭐          | 128K    | no     | $0.075 / $0.25 (cached $0.015) | Recommended default and test model; reasoning model — check `finish_reason` before trusting a short response. |
| `meta-llama/llama-3.3-70b-instruct` | 128K    | no     | —                              | Plain instruct chat model; fallback.                                                                          |
| `deepseek/deepseek-v3-0324`         | 128K    | no     | —                              | Non-reasoning DeepSeek chat model; fallback.                                                                  |
| `qwen/qwen-2.5-72b-instruct`        | 128K    | no     | —                              | Plain instruct chat model; fallback.                                                                          |
| `google/gemma-3-27b-it`             | 128K    | no     | —                              | Non-reasoning instruct model; fallback.                                                                       |

Context window shown is the catalog default of 128,000 tokens; the default
max output is 4,096 tokens — noticeably smaller than most catalog providers,
so raise `maxTokens` explicitly for longer completions or reasoning-heavy
prompts on the default model.

**Fallback order** when the default is unavailable: `meta-llama/llama-3.3-70b-instruct` →
`deepseek/deepseek-v3-0324` → `qwen/qwen-2.5-72b-instruct` →
`google/gemma-3-27b-it`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Novita AI:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                | authenticated GET /openai/v1/models, HTTP 200, 2026-09-05                                                                                                                                                                                                                                                                                  |
| Auth rejection        | HTTP 401 (`FAILED_TO_AUTH`), 2026-09-05                                                                                                                                                                                                                                                                                                    |
| Live capability sweep | 2026-09-05, probed against the default model. Chat, streaming, and a real structured tool call all passed. `response_format: json_object` succeeded both alone and combined with `tools` in the same request — confirmed at the SDK level, which is why `structuredOutputWithTools` is `true` for this provider, unlike Friendli or Morph. |

---

## Troubleshooting

| Symptom                                         | Cause                                                                                                | Fix                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `FAILED_TO_AUTH`                                | `NOVITA_API_KEY` unset, wrong, or not `sk_`-prefixed                                                 | Rotate the key at https://novita.ai/settings/key-management                                     |
| `MODEL_NOT_FOUND`                               | The roster changed since 2026-09-05                                                                  | Pick a current id from https://novita.ai/models or the authenticated `/openai/v1/models` roster |
| Truncated or empty content on the default model | `zai-org/glm-5.3-flash` is a reasoning model and the catalog default max output is only 4,096 tokens | Raise `maxTokens` for longer or reasoning-heavy completions                                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry)
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
