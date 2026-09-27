---
title: FriendliAI Provider Guide
description: FriendliAI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `zai-org/GLM-5.3`
keywords: friendli, friendliai, openai-compatible, tier 2, provider setup, glm
---

# FriendliAI Provider Guide

FriendliAI is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/friendli.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `friendli`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.friendli.ai/serverless/v1`
- **Default model**: `zai-org/GLM-5.3`
- **Models in catalog**: 7
- **Streaming**: supported
- **Tool calling**: supported (native)
- **Structured output**: supported. Friendli rejects `tools` + `response_format`
  together with HTTP 422 (`"response_format" field cannot be set when tools
are specified`), so NeuroLink proactively omits `response_format` whenever
  tools are present, before the request is sent — it does not wait for the
  422 and retry.
- **Embeddings**: not supported
- **Billing**: free-tier
- **Key format**: none declared
- **Rate limits**: tight — pace requests at least 20 seconds apart

---

## Quick Start

### 1. Get an API key

1. Visit: https://suite.friendli.ai/ and sign in
2. Create a Personal Access Token for the serverless endpoints
3. New accounts start with trial credit; confirm current billing terms in the console before heavy use
4. Set `FRIENDLI_API_KEY` in your .env file

### 2. Configure

```bash
export FRIENDLI_API_KEY=your-api-key
export FRIENDLI_MODEL=zai-org/GLM-5.3      # optional — overrides the default model
export FRIENDLI_BASE_URL=https://api.friendli.ai/serverless/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "friendli",
  model: "zai-org/GLM-5.3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider friendli
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "friendli",
  credentials: { friendli: { apiKey: process.env.FRIENDLI_API_KEY } },
});
```

---

## Models

| Model                       | Context | Vision | $/M in · out               | Notes                                                                                                                                                                                                                                                      |
| --------------------------- | ------- | ------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zai-org/GLM-5.3` ⭐        | 1M      | no     | $1.4 / $4.4 (cached $0.26) | Recommended — the only model in this roster capability-probed end to end (real tool call, SSE streaming, json_object). Heavy internal reasoner via `reasoning`/`reasoning_content` — give it a generous `maxTokens`. Rejects image/video input (HTTP 422). |
| `zai-org/GLM-5.3-Flash`     | 1M      | no     | —                          | Lighter/faster sibling of the default; roster-listed only, not itself capability-probed; fallback.                                                                                                                                                         |
| `zai-org/GLM-5.2`           | 1M      | no     | —                          | Prior GLM generation; roster-listed only; fallback.                                                                                                                                                                                                        |
| `zai-org/GLM-5.1`           | 1M      | no     | —                          | Prior GLM generation; roster-listed only; fallback.                                                                                                                                                                                                        |
| `google/gemma-4-31B-it`     | 1M      | no     | —                          | Google Gemma 4 31B instruct-tuned; roster-listed only; fallback.                                                                                                                                                                                           |
| `deepseek-ai/DeepSeek-V3.2` | 1M      | no     | —                          | DeepSeek V3.2; roster-listed only; fallback.                                                                                                                                                                                                               |
| `MiniMaxAI/MiniMax-M2.5`    | 1M      | no     | —                          | MiniMax M2.5; roster-listed only; fallback.                                                                                                                                                                                                                |

Context window shown is the catalog default of 1,048,576 tokens; the default
max output is 131,072 tokens (`zai-org/GLM-5.3`'s documented per-request
output ceiling, distinct from the context window).

**Fallback order** when the default is unavailable: `zai-org/GLM-5.3-Flash` →
`zai-org/GLM-5.2` → `zai-org/GLM-5.1` → `google/gemma-4-31B-it` →
`deepseek-ai/DeepSeek-V3.2` → `MiniMaxAI/MiniMax-M2.5`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for FriendliAI:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                | authenticated GET /serverless/v1/models, HTTP 200, 2026-09-06                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Auth rejection        | HTTP 401, 2026-09-06                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Live capability sweep | 2026-09-06, probed against the default model (`zai-org/GLM-5.3`) with generous pacing after an initial fast-cadence run tripped Friendli's rate limit. Chat, streaming (SSE, 62 events, terminal `[DONE]`), and a real structured tool call (`finish_reason=tool_calls`) all passed. `response_format: json_object` returned 200; `tools` + a JSON schema together returned HTTP 422. A real image part returned HTTP 422 (`"This model does not support image/video inputs"`). Only the default model was probed end to end; the other 6 roster ids are roster-verified by id only. |

---

## Troubleshooting

| Symptom                                                | Cause                                                                 | Fix                                                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `Invalid Friendli API key`                             | `FRIENDLI_API_KEY` unset or wrong                                     | Check the key at https://suite.friendli.ai/                                                                              |
| Model not found                                        | The roster changed since 2026-09-06                                   | Pick a current id from the authenticated `/serverless/v1/models` roster                                                  |
| Frequent 429s                                          | Friendli's rate limits are tight                                      | Pace requests at least 20 seconds apart and retry                                                                        |
| Structured output silently dropped when tools are used | Friendli rejects `response_format` when `tools` is present (HTTP 422) | NeuroLink omits `response_format` automatically whenever tools are present, before sending — this is expected, not a bug |
| Empty content at a small `maxTokens`                   | `zai-org/GLM-5.3` spends its budget on `reasoning_content` first      | Give reasoning prompts a generous `maxTokens` budget                                                                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
