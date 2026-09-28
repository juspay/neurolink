---
title: Ambient Provider Guide
description: Ambient on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `ambient/large`
keywords: ambient, openai-compatible, tier 2, provider setup, glm, qwen
---

# Ambient Provider Guide

Ambient is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/ambient.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

> **Verification status: docs- and roster-verified, not yet live-verified.**
> This entry was built entirely from Ambient's public docs pages and an
> unauthenticated `GET /v1/models` call — no API key was used or created.
> `capabilities.tools` and `capabilities.structuredOutput` come from the live
> roster's own self-reported `supported_features` field; the **combined**
> capabilities (`structuredOutputWithTools`, `toolsWithStreaming`) are
> deliberately left `false` because no live POST request was possible without
> credentials. `evidence.liveMatrix` is `null` until someone runs the real
> capability sweep with a working key.

---

## Key Facts

- **Provider id**: `ambient`
- **Protocol**: OpenAI- and Anthropic-compatible (`/chat/completions`)
- **Base URL**: `https://api.ambient.xyz/v1`
- **Default model**: `ambient/large` (a vendor-managed alias; see [Models](#models))
- **Models in catalog**: 4
- **Streaming**: documented (SSE, `"stream": true`, standard
  `chat.completion.chunk` objects)
- **Tool calling**: documented via the live roster's `supported_features`
  (`tools`) on all 4 models — not yet live-probed end to end
- **Structured output**: documented via the live roster's `supported_features`
  (`json_mode`, `structured_outputs`) on all 4 models — not yet live-probed
- **Embeddings**: not documented
- **Billing**: no free tier — cheapest plan is Starter at $1/mo
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://app.ambient.xyz and sign in
2. Click "Get API key" to create a key
3. Ambient has no free tier — the cheapest option is the $1/mo Starter plan (https://ambient.xyz/pricing); confirm current billing terms before use
4. Set `AMBIENT_API_KEY` in your .env file

### 2. Configure

```bash
export AMBIENT_API_KEY=your-api-key
export AMBIENT_MODEL=ambient/large        # optional — overrides the default model
export AMBIENT_BASE_URL=https://api.ambient.xyz/v1   # optional — proxy or override
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "ambient",
  model: "ambient/large",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider ambient
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "ambient",
  credentials: { ambient: { apiKey: process.env.AMBIENT_API_KEY } },
});
```

---

## Models

| Model              | Context | Max out | Vision | $/M in · out (cached in) | Notes                                                                                                                                                                                                |
| ------------------ | ------- | ------- | ------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ambient/large` ⭐ | 198K    | 198K    | no     | $0.60 / $2.00 ($0.15)    | Recommended — the model id used in every example in Ambient's own docs. A vendor-managed alias that today mirrors `z-ai/glm-5.2`; its specs "mirror whatever concrete model it currently points to." |
| `z-ai/glm-5.2`     | 198K    | 198K    | no     | $0.60 / $2.00 ($0.15)    | The concrete model `ambient/large` currently aliases. Docs call it "the supported production model." Fallback pinned to a stable id.                                                                 |
| `qwen/qwen3.6-27b` | 32K     | 8K      | yes    | $0.32 / $3.20 ($0.16)    | Natively multimodal (text + image), 27B dense. Docs mark non-GLM-5.2 entries as possible previews with no guarantees. Used as `visionModel`.                                                         |
| `qwen/qwen3.8-27b` | 32K     | 8K      | yes    | $0.32 / $3.20 ($0.16)    | Roster description also claims "video" input, but the live roster's `input_modalities` lists only text/image, so no video support is declared here. Preview.                                         |

Context/output/pricing are taken from the unauthenticated
`GET https://api.ambient.xyz/v1/models` response (2026-09-28) and cross-checked
against Ambient's own docs models page, which shows the same numbers rounded
(e.g. "198K" for 202,752 tokens).

**Fallback order** when the default is unavailable: `z-ai/glm-5.2` →
`qwen/qwen3.6-27b` → `qwen/qwen3.8-27b`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Ambient — and, just as importantly, what it does **not**
yet record:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated GET `/v1/models`, HTTP 200, 4 models, 2026-09-28 — no API key used                                                                                                                                                                                                                                                                                         |
| Auth rejection        | **not probed** — would require a POST, which is out of scope credential-free                                                                                                                                                                                                                                                                                               |
| Live capability sweep | **not run** (`evidence.liveMatrix` is `null`). `tools` and `structuredOutput` are set `true` from the live roster's own `supported_features` field (present on all 4 models today), not from a live request. `structuredOutputWithTools` and `toolsWithStreaming` are both `false` because no combined tools+schema or tools+streaming request was possible without a key. |

This entry should be treated as **docs- and roster-verified, not live-verified**.
Before relying on it in production, run the live matrix:

```bash
npx tsx test/continuous-test-suite-provider-matrix.ts --provider=ambient
node dist/cli/index.js generate "hello" --provider ambient
```

and record the outcome in `evidence.liveMatrix`.

---

## Troubleshooting

| Symptom                           | Cause                                                                                                        | Fix                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Invalid Ambient API key`         | `AMBIENT_API_KEY` unset or wrong                                                                             | Check the key at https://app.ambient.xyz                                            |
| Model not found (HTTP 400)        | Ambient returns `400` "Unknown model" for a bad id, not `404`                                                | Pick a current id from the unauthenticated `GET /v1/models` roster                  |
| `429` with "No workers available" | Ambient's docs describe this as a capacity/upstream issue, not a true rate limit                             | Retry with short jittered backoff, or switch to another model from `GET /v1/models` |
| Empty/cut-off content             | `ambient/large` and `z-ai/glm-5.2` are reasoning models; the docs say `max_tokens` "caps reasoning + answer" | Give reasoning prompts a generous `maxTokens` budget                                |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
