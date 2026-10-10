---
title: A2Agent Provider Guide
description: A2Agent on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek-v4-flash`
keywords: a2agent, openai-compatible, tier 2, provider setup, deepseek
---

# A2Agent Provider Guide

A2Agent is a **Tier-2 catalog provider**: an OpenAI-wire-compatible gateway
with no behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/a2agent.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `a2agent` (no aliases)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.a2agent.me/v1`
- **Default model**: `deepseek-v4-flash`
- **Models in catalog**: 1 (the gateway's roster listed 21 ids on 2026-09-21;
  only the default was verified)
- **Streaming**: supported
- **Tool calling**: supported, including while streaming
- **Structured output**: supported, including together with tools
- **Vision, embeddings, thinking**: not claimed
- **Billing**: `no-free-tier` — see [Billing](#billing)
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Create an account at https://a2agent.me/register
2. Create an API key at https://a2agent.me/keys
3. Set `A2AGENT_API_KEY` in your environment
4. Review trial-credit eligibility and prepaid rates at
   https://docs.a2agent.me/quickstart and https://a2agent.me/pricing

Or let the CLI walk you through it and write `.env` for you:

```bash
npx @juspay/neurolink setup a2agent
```

### 2. Configure

```bash
export A2AGENT_API_KEY=your-api-key
export A2AGENT_MODEL=deepseek-v4-flash             # optional — overrides the default model
export A2AGENT_BASE_URL=https://api.a2agent.me/v1  # optional — proxy or gateway in front of A2Agent
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "a2agent",
  model: "deepseek-v4-flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider a2agent
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "a2agent",
  credentials: { a2agent: { apiKey: process.env.A2AGENT_API_KEY } },
});
```

---

## Billing

A2Agent's pricing page (https://a2agent.me/pricing) describes prepaid,
pay-as-you-go per-token billing and states no free trial or free credits, so
the catalog records `no-free-tier`. The quickstart
(https://docs.a2agent.me/quickstart) describes trial-credit eligibility; check
it before assuming a new key will answer without a top-up.

---

## Models

| Model                  | Context | Vision | $/M in · out | Notes                                                              |
| ---------------------- | ------- | ------ | ------------ | ------------------------------------------------------------------ |
| `deepseek-v4-flash` ⭐ | 1M      | no     | —            | DeepSeek V4 Flash via A2Agent; live-verified chat and tool calling |

The 1,000,000-token context window matches the five other catalog entries
that serve the same model id (`api-route`, `charm-hyper`, `dashscope`,
`lemonfox-ai`, `mancer`). It has not been checked against A2Agent's own
completions endpoint. No price is recorded: the per-token rates on the pricing
page were not transcribed into the catalog, so NeuroLink books no cost for this
model.

Use the authenticated `GET https://api.a2agent.me/v1/models` for the current
model ids, and set `A2AGENT_MODEL` to select one outside the catalog.

**Fallback order** when the default is unavailable: `deepseek-v4-flash` (the
only catalog model).

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for A2Agent:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                | authenticated `GET https://api.a2agent.me/v1/models`, HTTP 200, 2026-09-21; `deepseek-v4-flash` present among 21 model ids                                                                                                                                                                                                                                                     |
| Auth rejection        | `GET /v1/models` with a deliberately invalid Bearer token, HTTP 401, 2026-09-21                                                                                                                                                                                                                                                                                                |
| Live capability sweep | 2026-09-21 — provider matrix 4/4 on `deepseek-v4-flash` (generate, stream, tools, structured output); CLI generate resolves the default. Direct SSE, tool calls, streaming tool calls, JSON output and tools + `response_format` probes pass; SDK generate executes a tool and validates its result against a schema; SDK streaming executes a tool with automatic tool choice |

**Not claimed:** forcing a required tool choice on every streaming step loops
until the request times out, so that mode is not supported. Vision,
embeddings and thinking-level controls were not probed.

---

## Troubleshooting

| Symptom                                   | Cause                                               | Fix                                                                              |
| ----------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| HTTP 401 `INVALID_API_KEY`                | `A2AGENT_API_KEY` unset or wrong                    | Create or copy the key at https://a2agent.me/keys                                |
| Model not found                           | The roster changed since 2026-09-21                 | List current ids with the authenticated `GET /v1/models` and set `A2AGENT_MODEL` |
| Stream never ends with a forced tool call | Required tool choice on every step is not supported | Leave `toolChoice` on automatic when streaming                                   |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
