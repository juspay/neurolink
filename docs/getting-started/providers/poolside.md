---
title: Poolside Provider Guide
description: Poolside on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `poolside/laguna-s-2.1`
keywords: poolside, laguna, openai-compatible, tier 2, provider setup
---

# Poolside Provider Guide

Poolside is a **Tier-2 catalog provider**: its entire integration is one JSON
file (`src/lib/providers/catalog/poolside.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** Poolside's `GET https://inference.poolside.ai/v1/models`
> needs a key (an unauthenticated GET answered HTTP 401), so the model id comes
> from Poolside's public docs and the roster has not been checked. No account
> was created and no API key was used to build it. `evidence.liveMatrix` is
> `null` until someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `poolside`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the
  [Poolside API page](https://docs.poolside.ai/api/overview.md) opens with
  "Call Poolside models through an OpenAI-compatible API."
- **Base URL**: `https://inference.poolside.ai/v1` (the "Poolside-hosted
  inference" row of the Access methods table on the same page)
- **Default model**: `poolside/laguna-s-2.1`
- **Models in catalog**: 1 — the model id the docs' examples use against the
  hosted base URL
- **Streaming**: supported — the
  [examples page](https://docs.poolside.ai/api/openai-api-examples.md) documents
  setting `stream` to `true` to receive "a series of chunks returned as
  server-sent events"
- **Tool calling**: supported (`true`) — the examples page's "Extend models with
  tools" section shows a `tools` array and a returned `tool_calls` array on
  `poolside/laguna-s-2.1`
- **Tools while streaming**: not declared (`false`) — no request combining them
  was sent
- **Structured output**: not declared (`false`) — no request using
  `response_format` was sent
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was sent
- **Embeddings**: not declared — the overview page's Available endpoints table
  lists two endpoints, `GET /v1/models` and `POST /v1/chat/completions`
- **Thinking**: not declared (`false`) — the entry sends no thinking request
  parameter. The examples page says "Poolside-hosted inference enables thinking
  by default." and documents setting `chat_template_kwargs.enable_thinking` to
  `false` to turn it off for a request
- **Reasoning content**: `quirks.replayReasoningContent` is set, because the
  examples page says "For agentic workflows with Poolside models, preserve
  reasoning_content from assistant responses when you include those responses in
  follow-up requests." No multi-turn request was sent
- **Billing**: `free-tier` — one of the three values the catalog schema allows;
  see [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.poolside.ai/ — https://docs.poolside.ai/get-started/log-in.md says of the Poolside Platform option: "sign in to Poolside Platform or create an account"
2. Create an API key: https://docs.poolside.ai/api/overview.md says "Sign in to Poolside Platform, open the API Keys tab, and click New key."
3. Billing as the vendor states it: https://docs.poolside.ai/get-started/log-in.md describes the Poolside Platform option as "free developer access" and says "The API key created through Poolside Platform is for Poolside-hosted inference."
4. Authentication is HTTP Bearer: https://docs.poolside.ai/api/overview.md shows the header `Authorization: Bearer <api-key>` and exports the key as POOLSIDE_API_KEY, the name NeuroLink reads. Set `POOLSIDE_API_KEY` in your .env file

### 2. Configure

```bash
export POOLSIDE_API_KEY=your-api-key
export POOLSIDE_MODEL=poolside/laguna-s-2.1   # optional — overrides the default model
export POOLSIDE_BASE_URL=https://inference.poolside.ai/v1   # optional — overrides the base URL
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "poolside",
  model: "poolside/laguna-s-2.1",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider poolside
```

Per-request credentials work the same way as for the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "poolside",
  credentials: { poolside: { apiKey: process.env.POOLSIDE_API_KEY } },
});
```

---

## Billing

[The log-in page](https://docs.poolside.ai/get-started/log-in.md) describes the
Poolside Platform option as "free developer access" and says "The API key
created through Poolside Platform is for Poolside-hosted inference." The catalog
schema has three billing values (`free-tier`, `free-with-card`, `no-free-tier`);
the entry holds `free-tier`, built from that wording.

---

## Models

| Model                      | Context | Vision | Notes                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `poolside/laguna-s-2.1` ⭐ | not set | no     | NeuroLink default — the model id the API page's quickstart examples and the examples page's examples use against `https://inference.poolside.ai/v1`. The [supported-models page](https://docs.poolside.ai/get-started/supported-models.md) lists "118B total, 8B active per token", "Mixture of Experts" and "Text-to-text". |

Values come from Poolside's public docs, retrieved 2026-09-29:

- **Context** — the catalog entry sets no `contextWindow` for this model, so
  `models.defaultContextWindow` (128,000) applies. The Context window row of the
  [supported-models page](https://docs.poolside.ai/get-started/supported-models.md)
  shows "1M tokens" for Laguna S 2.1, and the same page says "Model
  availability, provider-specific variants, and model IDs can vary by access
  method."
- **Vision** — `false`. The
  [model release notes](https://docs.poolside.ai/release-notes/models.md) say
  Laguna S 2.1 "is text-to-text and does not support vision inputs".
- **Description** — the release notes say Laguna S 2.1 is "built for agentic
  coding and long-horizon work". The supported-models page lists Reasoning as
  "Native reasoning with thinking on or off per request".
- **Pricing** — no `pricingPerMTok` is set.

`models.defaultContextWindow` (128,000) is a placeholder, not a vendor figure.
`models.defaultMaxOutputTokens` (32,768) equals the `max_tokens` default in the
Control generation table on the
[examples page](https://docs.poolside.ai/api/openai-api-examples.md); it is not
a per-model limit. The model's `status` field holds `production`, a placeholder
for a value the catalog schema requires; it is not a vendor statement.

**Fallback order:** the catalog has one model, so `poolside/laguna-s-2.1` is
also the fallback.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Poolside — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://inference.poolside.ai/v1/models` answered HTTP 401 without a key on 2026-09-29, so the model id is taken from https://docs.poolside.ai/api/overview.md (retrieved 2026-09-29); roster not verified                                                                                     |
| Billing                   | https://docs.poolside.ai/get-started/log-in.md describes the Poolside Platform option as "free developer access"; https://platform.poolside.ai/ opened and shows the title "Poolside Platform"; no signup was performed, 2026-09-29                                                                                 |
| Auth-failure shape        | unauthenticated `GET /v1/models` answered HTTP 401, content-type `text/plain; charset=utf-8`, plain-text body "No Authorization header provided"; unauthenticated `GET /v1/chat/completions` answered HTTP 405 with an empty body. No POST request was sent. `errorRules` carry 401 (observed) and 403 (documented) |
| Tools / structured output | function calling is documented on https://docs.poolside.ai/api/openai-api-examples.md; it was not exercised live, and no request using `response_format` or combining tools with a schema was sent — `structuredOutput` and `structuredOutputWithTools` stay `false`                                                |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=poolside` with a real key and record the result.                                                                                             |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                                   | Cause                                                                                                                                                                                                                      | Fix                                                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| HTTP 401 with the body `No Authorization header provided` | Observed on 2026-09-29 for an unauthenticated `GET /v1/models`; https://docs.poolside.ai/api/overview.md says "Poolside-hosted inference and OpenRouter require an API key."                                               | The same page says "Send it as a Bearer token in the Authorization header"; set `POOLSIDE_API_KEY` |
| `403 Forbidden: please check the api-key you provided`    | Listed under "Fix API key or token errors" on https://docs.poolside.ai/cli/troubleshooting.md, which says "These errors usually mean the prompt reached the agent, but the agent or model request could not authenticate." | That page's first step is "Check whether authentication environment variables are set."            |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
