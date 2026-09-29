---
title: Hetzner Inference Provider Guide
description: Hetzner Inference on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `Qwen/Qwen3.6-35B-A3B-FP8`
keywords: hetzner, hetzner-inference, openai-compatible, tier 2, provider setup, qwen
---

# Hetzner Inference Provider Guide

Hetzner Inference is a **Tier-2 catalog provider**: its integration is one JSON
file (`src/lib/providers/catalog/hetzner-inference.json`) rather than
hand-written code. That file is the source of truth for this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** Hetzner's `GET /models` needs a key, so the model ids come
> from its public docs page and the roster has not been checked. No account was
> created and no API key was used to build the entry. `evidence.liveMatrix` is
> `null` (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `hetzner-inference` (alias `hetzner`)
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the docs page says
  "The Inference API provides access to open-source large language models via
  an OpenAI-compatible REST API."
  ([docs](https://docs.hetzner.com/general/company-and-policy/experiments/inference/))
- **Base URL**: `https://inference.hetzner.com/api/v1`
- **Default model**: `Qwen/Qwen3.6-35B-A3B-FP8`
- **Models in catalog**: 2 — the two rows of the docs page's Available Models
  table, with ids copied from the table cells
- **Vision**: `true` on both catalog rows — the table's Modalities cell reads
  "Text, Image" for each
- **Streaming**: not declared (`false`)
- **Tool calling**: not declared (`false`)
- **Tools while streaming**: not declared (`false`)
- **Structured output**: not declared (`false`)
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Embeddings**: not declared (`false`)
- **Thinking**: not declared (`false`)
- **Service status**: the docs page's note reads "This service is provided for
  experimental purposes only and is offered "as is"." and "Performance and
  availability are not guaranteed, especially during periods of high demand."
  The same note reads "No backups are created, so you are responsible for
  backing up your own configurations and should not use the platform for
  production environments."
- **Billing**: `free-tier` — the docs FAQ says "As long as the Inference API
  remains in experimental status, it is free of charge."
- **Key format**: none declared

---

## Quick Start

### 1. Get an API token

1. Visit: https://experiments.hetzner.com/inference — the page is client-rendered; its public JavaScript bundle labels the token area "Tokens" and the button "Create API Token" (sign-in was not attempted while building this entry)
2. Create an API token and copy it. The docs' curl examples (https://docs.hetzner.com/general/company-and-policy/experiments/inference/) use the header `Authorization: Bearer <YOUR_TOKEN>`
3. Billing as the vendor states it: "As long as the Inference API remains in experimental status, it is free of charge." (FAQ, same docs page)
4. Set `HETZNER_INFERENCE_API_KEY` in your .env file

### 2. Configure

```bash
export HETZNER_INFERENCE_API_KEY=your-api-token
export HETZNER_INFERENCE_MODEL=Qwen/Qwen3.6-35B-A3B-FP8   # optional — overrides the default model
export HETZNER_INFERENCE_BASE_URL=https://inference.hetzner.com/api/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "hetzner-inference",
  model: "Qwen/Qwen3.6-35B-A3B-FP8",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider hetzner-inference
```

Per-request credentials:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "hetzner-inference",
  credentials: {
    hetznerInference: { apiKey: process.env.HETZNER_INFERENCE_API_KEY },
  },
});
```

---

## Models

| Model                         | Context | Vision | Notes                                                                                                                                                |
| ----------------------------- | ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Qwen/Qwen3.6-35B-A3B-FP8` ⭐ | 262,144 | yes    | NeuroLink default. Type "Causal LM + Vision (MoE, 35B total / 3B active)"; named in the docs page's four code examples, including its image example. |
| `Qwen3.8-27B`                 | 262,144 | yes    | Fallback. Type "Dense"; Modalities "Text, Image".                                                                                                    |

The figures come from the Available Models table of
https://docs.hetzner.com/general/company-and-policy/experiments/inference/
(retrieved 2026-09-29): Context Length "262,144 tokens" and Modalities "Text,
Image" on both rows. The same page says "Only a selected list of models is
available. This selection will change during the experimental phase." and "The
response of the models endpoint is definitive."

`models.defaultContextWindow` (32,768) and `models.defaultMaxOutputTokens`
(4,096) are placeholders the vendor does not publish. They apply to model ids
outside the catalog, and the output figure applies to both catalog rows, which
carry no `maxOutputTokens`.

**Fallback order** when the default is unavailable: `Qwen3.8-27B`.

Licenses, as the page's Open-Source Model Licenses table lists them: rows
"Qwen3.6-35B-A3B" and "Qwen3.8-27B", each with Developer "Alibaba Cloud (Qwen
Team)" and License "Apache 2.0". The page also says "By using this API, you
acknowledge the applicable license terms of the underlying model(s)."

---

## Rate limits

The docs FAQ says "Current limits are applied per API key:" followed by a table
with Timeframe "60s", Input Tokens "4M" and Output Tokens "100k". A second
table, introduced by "Additionally, we enforce request-level rate-limits as
follows:", lists Timeframe "60s" and Requests "10". The FAQ continues: "If you
exceed any of the rate limits, the API will respond with HTTP Status Code 429."

`errorRules` maps HTTP 429 to NeuroLink's rate-limit error class and HTTP 401
to its authentication class.

---

## Data handling

The docs FAQ says "We do not store the content of request and response and we
do not plan on doing so in the future (unless some law requires us to do so)."

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the catalog
currently records for Hetzner Inference — **docs-verified only, not
live-verified**:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated `GET https://inference.hetzner.com/api/v1/models`, HTTP 401, 2026-09-29 — no key used; the model ids are taken from the docs page's Available Models table, and the roster has not been checked                                                                                                        |
| Auth-failure shape    | the same unauthenticated `GET /models` returned HTTP 401, content-type `application/json; charset=utf-8`, body `{"error":"unauthorized"}`; an unauthenticated `GET /chat/completions` on the same day answered HTTP 404, content-type `text/plain; charset=utf-8`, body "404 page not found". No POST request was sent |
| Billing               | public docs FAQ, 2026-09-29: "As long as the Inference API remains in experimental status, it is free of charge. Should this status change, we will notify you in advance via email with detailed information."                                                                                                        |
| Capabilities          | `text` is `true` because the docs page shows chat-completion examples in Python and curl; the other capability flags are `false` (not declared), and no request exercising them was sent                                                                                                                               |
| Live capability sweep | **not run.** `evidence.liveMatrix` is `null`.                                                                                                                                                                                                                                                                          |

---

## Troubleshooting

| Symptom                               | What the vendor states or what was observed                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 401                              | Observed 2026-09-29: an unauthenticated `GET /models` answered HTTP 401 with `{"error":"unauthorized"}`. NeuroLink reads the token from `HETZNER_INFERENCE_API_KEY` |
| HTTP 429                              | Docs FAQ: "If you exceed any of the rate limits, the API will respond with HTTP Status Code 429." Limits are listed under [Rate limits](#rate-limits)               |
| Model ids differ from the table above | Docs page: "This selection will change during the experimental phase." and "The response of the models endpoint is definitive."                                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
