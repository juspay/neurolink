---
title: OVHcloud AI Endpoints Provider Guide
description: OVHcloud AI Endpoints on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `gpt-oss-120b`
keywords: ovhcloud, ovh, ai endpoints, openai-compatible, tier 2, provider setup, gpt-oss, qwen
---

# OVHcloud AI Endpoints Provider Guide

OVHcloud AI Endpoints is a **Tier-2 catalog provider**: OpenAI-wire-compatible
with no behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/ovhcloud.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status**: this entry is **docs- and roster-verified, not
> yet live-verified**. It was built entirely from OVHcloud's own public
> documentation pages and one unauthenticated `GET /v1/models` call — no
> account was created, no key was issued, and no authenticated or `POST`
> request was ever sent. `evidence.liveMatrix` is `null` until someone runs
> the credentialed matrix (see [Live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification)
> below).

---

## Key Facts

- **Provider id**: `ovhcloud`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — OVHcloud's own docs
  state the LLM APIs are "compatible with the OpenAI specifications"
- **Base URL**: `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1`
- **Default model**: `gpt-oss-120b`
- **Models in catalog**: 14 (chat-completions models only — see
  [Out of scope](#out-of-scope-non-chat-endpoints))
- **Streaming**: documented (the vendor's own `gpt-oss-120b` catalog card
  lists "Streaming" under Supported Features)
- **Tool calling**: model-dependent — documented per-model on OVHcloud's
  catalog page (Yes for `gpt-oss-120b`, `gpt-oss-20b`, the four Qwen3.x
  visual models and `Meta-Llama-3_3-70B-Instruct`; No for
  `Qwen2.5-VL-72B-Instruct`)
- **Structured output**: documented — OVHcloud's capabilities guide
  describes both JSON Mode (`json_object`) and JSON-Schema Structured
  Outputs, and the `gpt-oss-120b` catalog card lists `json_object` and
  `json_schema` under Output Formats
- **Tools + structured output together**: not asserted. No combined probe
  was possible without credentials, so `structuredOutputWithTools` is
  `false` and `toolsWithStreaming` is conservatively `false` too — both
  features are independently documented, but nothing confirms they compose
  correctly in one request
- **Embeddings**: not wired (OVHcloud does serve embedding models, but as
  separate endpoints outside this chat-completions integration's scope)
- **Billing**: free-with-card — several individual models are billed at
  €0, but OVHcloud's own docs state a project in "Discovery mode" (no
  payment method attached) cannot use the API at all
- **Key format**: none declared
- **Rate limits**: documented as 400 requests/minute per project per model
  with a key; 429 on overage

---

## Quick Start

### 1. Get an API key

1. Visit: https://www.ovhcloud.com/en/public-cloud/ai-endpoints/ and click
   Start now, which signs you in to (or creates) an OVHcloud Public Cloud
   manager account
2. In the manager, open Public Cloud > your project > AI & Machine Learning
   > AI Endpoints, and add a payment method to the project — OVHcloud
   > states that projects in Discovery mode (no payment method) cannot use
   > the service
3. Create an AI Endpoints API access token in that section; it is shown
   only once, so store it yourself, and note it can be given an expiration
   date and revoked
4. Set `OVH_AI_ENDPOINTS_ACCESS_TOKEN` in your .env file (this is the exact
   variable name OVHcloud's own code samples use)

### 2. Configure

```bash
export OVH_AI_ENDPOINTS_ACCESS_TOKEN=your-access-token
export OVHCLOUD_MODEL=gpt-oss-120b      # optional — overrides the default model
export OVHCLOUD_BASE_URL=https://oai.endpoints.kepler.ai.cloud.ovh.net/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "ovhcloud",
  model: "gpt-oss-120b",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider ovhcloud
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "ovhcloud",
  credentials: {
    ovhcloud: { apiKey: process.env.OVH_AI_ENDPOINTS_ACCESS_TOKEN },
  },
});
```

---

## Models

| Model                                 | Context | Vision | Tools | $/M in · out  | Notes                                                                                                           |
| ------------------------------------- | ------- | ------ | ----- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `gpt-oss-120b` ⭐                     | 131K    | no     | yes   | $0.09 / $0.47 | Recommended — the vendor's own example model; docs confirm streaming, tools, reasoning, json_object/json_schema |
| `gpt-oss-20b`                         | 131K    | no     | yes   | $0.05 / $0.18 | Smaller gpt-oss sibling; roster-listed, catalog-page confirmed; fallback                                        |
| `Qwen3.6-27B`                         | 262K    | yes    | yes   | $0.47 / $3.19 | Visual LLM (New); catalog-page confirmed; fallback                                                              |
| `Qwen3.8-27B`                         | 262K    | yes    | yes   | $0.47 / $3.19 | Visual LLM (New), newer sibling of 3.6; catalog-page confirmed                                                  |
| `Qwen3.5-397B-A17B`                   | 262K    | yes    | yes   | $0.71 / $4.25 | Largest MoE in the roster (397B params, ~17B active); catalog-page confirmed                                    |
| `Qwen3.5-9B`                          | 262K    | yes    | yes   | $0.12 / $0.18 | Smallest of the Qwen3.x visual family; catalog-page confirmed                                                   |
| `Meta-Llama-3_3-70B-Instruct`         | 131K    | no     | yes   | $0.74 / $0.74 | Plain non-reasoning instruct model; catalog-page confirmed                                                      |
| `Qwen2.5-VL-72B-Instruct`             | 32K     | yes    | no    | $1.01 / $1.01 | Dedicated vision-language model; `models.visionModel`. No tools per catalog page                                |
| `Qwen3-Coder-30B-A3B-Instruct`        | 262K    | no     | n/a   | $0.07 / $0.26 | Live roster only — not yet on the marketing catalog page as of 2026-09-28                                       |
| `Mistral-Small-3.2-24B-Instruct-2506` | 131K    | no     | n/a   | $0.10 / $0.31 | Live roster only — not yet on the marketing catalog page as of 2026-09-28                                       |
| `Mistral-7B-Instruct-v0.3`            | 65K     | no     | n/a   | $0.11 / $0.11 | Live roster only — not yet on the marketing catalog page as of 2026-09-28                                       |
| `Mistral-Nemo-Instruct-2407`          | 65K     | no     | n/a   | $0.14 / $0.14 | Live roster only — not yet on the marketing catalog page as of 2026-09-28                                       |
| `Qwen3Guard-Gen-8B`                   | 32K     | no     | no    | free          | Moderation/safety classifier, Beta — excluded from fallbacks/topModels                                          |
| `Qwen3Guard-Gen-0.6B`                 | 32K     | no     | no    | free          | Smaller moderation/safety classifier, Beta — excluded from fallbacks/topModels                                  |

Context window and output cap per model are the live, unauthenticated
`GET /v1/models` response's own `context_length` / `max_completion_tokens`
fields (retrieved 2026-09-28). Pricing is that same response's per-token USD
figures converted to $/MTok, cross-checked against the EUR prices on
OVHcloud's public catalog page where a model appears there.

**Fallback order** when the default is unavailable: `gpt-oss-20b` →
`Meta-Llama-3_3-70B-Instruct` → `Qwen3.6-27B` →
`Mistral-Small-3.2-24B-Instruct-2506` → `Qwen3.5-9B`.

### Out-of-scope (non-chat) endpoints

OVHcloud AI Endpoints also serves speech-to-text (`whisper-large-v3`,
`whisper-large-v3-turbo`), text-to-speech (four NVIDIA Riva voices),
image generation (`stable-diffusion-xl-base-v10`) and embeddings (`bge-m3`,
`bge-multilingual-gemma2`, `Qwen3-Embedding-8B`) on the same platform and
base URL prefix. These are separate, non-chat-completions API shapes and
are not part of this Tier-2 catalog entry, so `capabilities.embeddings` is
`false` here even though the vendor documents embedding models elsewhere on
the same platform.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for OVHcloud AI Endpoints — deliberately **credential-free**:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | **unauthenticated** GET `/v1/models`, HTTP 200, 2026-09-28 — 24 models returned; no key used                                                                                                                                                                                                                            |
| Auth rejection        | not probed — would require an authenticated request, which this credential-free onboarding does not send. The `errorRules` entry for authentication failures is taken verbatim from OVHcloud's written docs ("403 Forbidden: Authentication Failed"), not from a live probe                                             |
| Live capability sweep | **not run** (`evidence.liveMatrix` is `null`). `capabilities.tools`, `.streaming`, `.structuredOutput` and `.thinking` are set from OVHcloud's own getting-started guide, capabilities guide, and the `gpt-oss-120b` catalog card's "Supported Features" / "Output Formats" lists — not from a live request of any kind |

Because no live request was ever made, treat every capability flag here as
**doc-asserted, not wire-proven** until a credentialed pass fills in
`evidence.liveMatrix` per
[Tier-2 onboarding: Live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification).

---

## Troubleshooting

| Symptom                         | Cause                                                            | Fix                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Requests fail immediately       | Project has no payment method attached ("Discovery mode")        | Add a payment method to the Public Cloud project in the OVHcloud manager before creating/using an access token |
| `Invalid or revoked ... token`  | `OVH_AI_ENDPOINTS_ACCESS_TOKEN` unset, wrong, or revoked         | Check/recreate the token under AI & Machine Learning > AI Endpoints in the OVHcloud manager                    |
| Frequent 429s                   | Authenticated limit is 400 requests/minute per project per model | Pace requests and/or request a higher limit from OVHcloud support                                              |
| Model not found                 | The roster changed since 2026-09-28                              | Pick a current id from the unauthenticated `GET /v1/models` roster                                             |
| Tool calls silently unsupported | `capabilities.tools` is model-dependent                          | Use a model the catalog page marks Function calling: Yes (e.g. `gpt-oss-120b`, not `Qwen2.5-VL-72B-Instruct`)  |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration, and what a credentialed live-verification pass still needs to add
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
