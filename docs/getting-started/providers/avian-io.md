---
title: Avian Provider Guide
description: Avian on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek/deepseek-v4-pro-0813`
keywords: avian, avian-io, openai-compatible, tier 2, provider setup, deepseek, glm, kimi
---

# Avian Provider Guide

Avian is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/avian-io.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** Every field below comes from Avian's own public pages and an
> unauthenticated `GET /v1/models` call — no account was created and no API key
> was used to build it. `evidence.liveMatrix` is `null` until someone runs the
> live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `avian-io` (alias `avian`)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.avian.io/v1`
- **Default model**: `deepseek/deepseek-v4-pro-0813`
- **Models in catalog**: 12 (curated from a 13-model live roster;
  `z-ai/glm-4.7` is the one left out, only to stay inside the 12-model cap)
- **Streaming**: supported — the docs' Streaming section documents
  `stream: true` with server-sent events
  ([docs](https://avian.io/docs/))
- **Tool calling**: `model-dependent` — the docs describe function calling with
  a `tools` array and a returned `tool_calls` array, but show it only on
  `deepseek/deepseek-v3.2`. The homepage and About page say native tool calling
  comes "across all models", which is a marketing claim with no per-model
  detail behind it
- **Tools while streaming**: not declared (`false`) — the docs document tools
  and streaming separately, never together
- **Structured output**: not declared (`false`) — the docs' request-parameter
  table lists `model`, `messages`, `temperature`, `max_tokens`, `stream` and
  `tools`, and no `response_format`
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared — the docs describe only chat completions
- **Thinking**: not declared — the roster flags six models `reasoning: true`,
  but the docs describe no reasoning controls or reasoning output field
- **Billing**: `no-free-tier` — prepaid credits only, see
  [Billing](#billing) below
- **Key format**: none declared. The docs' examples show keys that start with
  `avian-`, but nothing states that as a rule, so NeuroLink does not validate
  it

---

## Quick Start

### 1. Get an API key

1. Visit: https://avian.io/accounts/signup/ and sign up with Google or a work email and password
2. Create an API key from your signed-in account — the public pages only say "Get your API key in under a minute" (https://avian.io/pricing/) and do not name the key page; the docs examples show keys that start with avian-
3. Prepaid credits only: add credits before calling the API (https://avian.io/pricing/ lists $50, $100, $150 and $250 packages); the sign-up buttons say "Get Started Free" but no free credits are stated anywhere, and the docs list HTTP 402 for an insufficient credit balance (https://avian.io/docs/)
4. Set `AVIAN_IO_API_KEY` in your .env file (the vendor's homepage example reads `AVIAN_API_KEY`, which NeuroLink does not)

### 2. Configure

```bash
export AVIAN_IO_API_KEY=your-api-key
export AVIAN_IO_MODEL=deepseek/deepseek-v4-pro-0813   # optional — overrides the default model
export AVIAN_IO_BASE_URL=https://api.avian.io/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "avian-io",
  model: "deepseek/deepseek-v4-pro-0813",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider avian-io
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "avian-io",
  credentials: { avianIo: { apiKey: process.env.AVIAN_IO_API_KEY } },
});
```

---

## Billing

Avian's pricing page (https://avian.io/pricing/) describes "per-token pricing
with prepaid credits", "no subscriptions, no commitments", credits that "never
expire", and credit packages of $50, $100, $150 and $250. Its docs list
HTTP `402 Payment Required` as "Insufficient credit balance"
(https://avian.io/docs/). No page states free credits or a free tier, so the
entry records `no-free-tier`. The "Get Started Free" button on the public
pages is the sign-up call to action; it is not a stated free allowance.

---

## Models

| Model                              | Context   | Max output | Vision | $/M in · out (cache read)  | Notes                                                                                                                              |
| ---------------------------------- | --------- | ---------- | ------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `deepseek/deepseek-v4-pro-0813` ⭐ | 1,000,000 | 393,216    | no     | $0.594 / $1.782 ($0.0198)  | Default — the model Avian promotes with a "now live" banner on its home, docs, models, pricing and About pages. Reasoning-flagged. |
| `deepseek/deepseek-v4-flash`       | 1,000,000 | 393,216    | no     | $0.0805 / $0.161 ($0.0165) | Fallback; lowest input and output price on the roster. Reasoning-flagged.                                                          |
| `deepseek/deepseek-v3.2`           | 163,840   | 65,536     | no     | $0.23 / $0.33 ($0.012)     | Fallback; the model in every docs code example, labelled "(Legacy)" by the vendor. Reasoning-flagged.                              |
| `z-ai/glm-5.2`                     | 1,048,576 | 131,072    | no     | $0.495 / $1.733 ($0.124)   | Fallback; highest-numbered GLM on the roster.                                                                                      |
| `deepseek/deepseek-v4-pro`         | 1,000,000 | 393,216    | no     | $1.305 / $2.61 ($0.10875)  | Undated V4 Pro build; roster-listed only. Reasoning-flagged.                                                                       |
| `minimax/minimax-m2.5`             | 196,608   | 131,072    | no     | $0.27 / $1.08 ($0.15)      | Roster-listed only.                                                                                                                |
| `z-ai/glm-5`                       | 204,800   | 131,072    | no     | $0.516 / $2.322 ($0.129)   | Roster-listed only.                                                                                                                |
| `z-ai/glm-5.1`                     | 202,752   | 202,752    | no     | $0.743 / $2.971 ($0.186)   | Roster-listed only.                                                                                                                |
| `moonshotai/kimi-k2.5`             | 262,144   | 262,144    | no     | $0.45 / $2.2 ($0.225)      | Roster-listed only.                                                                                                                |
| `moonshotai/kimi-k2.6`             | 262,144   | 262,144    | no     | $0.95 / $4 ($0.16)         | Roster-listed only.                                                                                                                |
| `xiaomi/mimo-v2.6-flash`           | 1,048,576 | 131,072    | no     | $0.2 / $0.4 ($0.05)        | Roster-listed only. Reasoning-flagged.                                                                                             |
| `xiaomi/mimo-v2.6-pro`             | 1,048,576 | 131,072    | no     | $0.435 / $0.87 ($0.0036)   | Roster-listed only. Reasoning-flagged.                                                                                             |

Context, max output and prices come from an unauthenticated
`GET https://api.avian.io/v1/models` call made 2026-09-29 (13 models, all chat
models; 12 curated into this catalog). The same prices appear on
[the docs page](https://avian.io/docs/),
[the models page](https://avian.io/models/) and
[the pricing page](https://avian.io/pricing/), which also state context and
max output in rounded form (for example "1M" and "384K"). "Reasoning-flagged"
means the roster's `reasoning` field is `true`; it is not a documented
capability.

`models.defaultContextWindow` (163,840) and `models.defaultMaxOutputTokens`
(65,536) are the smallest context and max-output values on today's roster, so a
model id that is not in the catalog gets a figure no roster model falls below.
They are not a vendor-stated general cap.

**Vision:** every model is `vision: false`. The homepage and About page list
"vision analysis" among built-in capabilities "across all models", but no page
says which models accept image input in a chat message, so none is declared.

**Fallback order** when the default is unavailable:
`deepseek/deepseek-v4-flash` → `deepseek/deepseek-v3.2` → `z-ai/glm-5.2`. The
runtime fallback model name the loader derives (`fallbacks[1]`) is
`deepseek/deepseek-v3.2`, the one model the docs' function-calling and
streaming examples use.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Avian — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                    | unauthenticated `GET /v1/models`, HTTP 200, 13 models, 2026-09-29 — no key used                                                                                                                                                                              |
| Billing                   | public pricing page describes prepaid credits with no subscription and states no free tier or free credits, 2026-09-29                                                                                                                                       |
| Auth-failure shape        | the docs list HTTP 401 "Missing or invalid API key" and 402 "Insufficient credit balance" but describe the error body only as "a JSON body with a descriptive message"; the body was not probed, so `errorRules` match the status codes alone (`401`, `402`) |
| Tools / structured output | function calling is documented at https://avian.io/docs/; `response_format` is not documented anywhere opened. Neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                         |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=avian-io` with a real key and record the result.                                      |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                       | Cause                                                                                                    | Fix                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 402 on every request                     | No prepaid credit balance — Avian has no free tier                                                       | Add credits at https://avian.io/pricing/ (the package amounts are listed there)                                                                                       |
| HTTP 401                                      | Missing or invalid key, or the key was set under the wrong variable name                                 | Set `AVIAN_IO_API_KEY`; the vendor's homepage example uses `AVIAN_API_KEY`, which NeuroLink does not read                                                             |
| Model not found                               | The roster changed since 2026-09-29, or a display name was used instead of an id                         | Use an id exactly as listed by the unauthenticated `GET /v1/models`; the homepage snippet's `DeepSeek-V3.2` is not a roster id, the docs' `deepseek/deepseek-v3.2` is |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry — untested combination                              | NeuroLink omits `response_format` automatically whenever tools are present, before sending                                                                            |
| Tool calls not returned                       | Tool calling on Avian is `model-dependent` here — only `deepseek/deepseek-v3.2` has a documented example | Try `deepseek/deepseek-v3.2`, then report which models work so the entry can be tightened                                                                             |
| Unexpected HTTP 429                           | The pages say "No Rate Limits", yet the docs list 429 "Rate limit exceeded. Retry after a brief delay"   | Back off briefly and retry; the vendor's own docs describe 429 as retryable                                                                                           |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
