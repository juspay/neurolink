---
title: Subconscious Provider Guide
description: Subconscious on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `subconscious/glm-5.3-marathon`
keywords: subconscious, openai-compatible, tier 2, provider setup, glm, marathon
---

# Subconscious Provider Guide

Subconscious is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/subconscious.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** It is built from Subconscious's public documentation and
> pricing pages and unauthenticated GET requests to `/v1/models` and
> `/v1/chat/completions`. No API key was created or used, and no POST request
> was sent. `evidence.liveMatrix` is `null` until someone runs the live
> capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `subconscious`
- **Protocol**: OpenAI-compatible (`/chat/completions`). The vendor overview
  says "Our API is compatible with both the OpenAI Completions and Anthropic
  Messages APIs" ([overview](https://docs.subconscious.dev/overview)); this
  entry uses the OpenAI format
- **Base URL**: `https://api.subconscious.dev/v1`
- **Default model**: `subconscious/glm-5.3-marathon`
- **Models in catalog**: 3 (the roster lists 4)
- **Streaming**: supported. The API reference says "Each event is a
  ChatCompletionChunk object" and describes the stream as ending with
  `data: [DONE]`
  ([API reference](https://docs.subconscious.dev/api-reference/chat-completions))
- **Tool calling**: declared `false`; not probed with a key. The pricing page's
  plan card says "Drop-in for Claude Code, Codex, OpenCode, or any
  OpenAI-compatible harness" ([pricing](https://www.subconscious.dev/pricing))
- **Structured output**: declared `false`. The API reference says of
  `response_format`: "Currently unsupported. The request may accept this field,
  but it is ignored and does not constrain the model output to JSON or a
  schema."
- **Structured output + tools together**: declared `false`; not probed with a
  key
- **Thinking**: declared `false`. The API reference lists
  `chat_template_kwargs` with `enable_thinking` as a "Subconscious extension"
  ([API reference](https://docs.subconscious.dev/api-reference/chat-completions))
- **Embeddings**: declared `false`
- **Billing**: `no-free-tier` is the catalog schema's required field value
  here, not a vendor statement. The cloud-API page says "Usage is billed per
  token." and "Credits are added from your dashboard"
  ([cloud API](https://docs.subconscious.dev/ways-to-use/cloud-api)). The
  vendor's
  [GLM-5.2 launch post](https://www.subconscious.dev/blog/subconscious-glm-5-2-makes-compact-obsolete)
  (June 22, 2026) says "You also get $50 credits to test the model
  performance"; no account was created, so that offer was not tried
- **Key format**: not recorded (`apiKeyFormat` is `null`)

---

## Quick Start

### 1. Get an API key

1. Visit https://subconscious.dev/platform and sign up or sign in (the [quickstart](https://docs.subconscious.dev/quickstart) describes signing up on the platform and generating an API key from the dashboard)
2. Create an API key at https://subconscious.dev/platform/api-keys and copy it ([cloud API](https://docs.subconscious.dev/ways-to-use/cloud-api) says API keys are created and managed from the dashboard)
3. Pricing is at https://www.subconscious.dev/pricing (monthly token plans and usage-based per-token pricing)
4. Set `SUBCONSCIOUS_API_KEY` in your .env file

### 2. Configure

```bash
export SUBCONSCIOUS_API_KEY=your-api-key
export SUBCONSCIOUS_MODEL=subconscious/glm-5.3-marathon   # optional — overrides the default model
export SUBCONSCIOUS_BASE_URL=https://api.subconscious.dev/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "subconscious",
  model: "subconscious/glm-5.3-marathon",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider subconscious
```

Per-request credentials:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "subconscious",
  credentials: { subconscious: { apiKey: process.env.SUBCONSCIOUS_API_KEY } },
});
```

---

## Models

| Model                                       | Vision (placeholder) | $/M in · out                 | Notes                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subconscious/glm-5.3-marathon`             | no                   | $1.40 / $4.40 (cached $0.26) | NeuroLink default. The pricing page lists it under the name "GLM-5.3 Marathon", with the description "Open-source frontier coding model".                                                                                                                                                                           |
| `subconscious/deepseek-v4.1-flash-marathon` | no                   | not attached (see below)     | NeuroLink fallback. The homepage FAQ says "On our managed inference service, we serve GLM 5.3 Marathon and DeepSeek V4.1 Flash Marathon." The pricing page lists a different id, `subconscious/deepseek-v4-flash-marathon`, with the description "Multimodal & high-throughput DeepSeek V4". Not probed with a key. |
| `subconscious/tim-qwen3.6-27b`              | no                   | not attached                 | NeuroLink fallback. The vendor's [May 21, 2026 blog post](https://www.subconscious.dev/blog/introducing-tim-qwen3-6-27b) "Introducing TIM-Qwen3.6-27B" says the model is "available via the OpenAI chat completions and Anthropic messages API formats". Not probed with a key.                                     |

The three ids above are on the unauthenticated `GET /v1/models` roster
(2026-09-29). The `vision` value (`false`, shown as `no` in the table) of the
three listed models is a schema-required placeholder the vendor does not
publish per model.

Pricing comes from the pricing page (https://www.subconscious.dev/pricing,
retrieved 2026-09-29), in USD per 1M tokens. It is attached to
`subconscious/glm-5.3-marathon`, the id the page lists. The page lists
`subconscious/deepseek-v4-flash-marathon` at $0.14 input / $0.28 output /
$0.0028 cached; that id differs from the roster id
`subconscious/deepseek-v4.1-flash-marathon`, so no pricing is attached to the
roster id.

`models.defaultContextWindow` (200,000) and `models.defaultMaxOutputTokens`
(4,096) are placeholders the vendor does not publish per model; the catalog
schema requires both. Neither was probed.

The roster also lists `test-dsv4-vision`, which is not in this catalog.

**Fallback order:** `subconscious/deepseek-v4.1-flash-marathon` →
`subconscious/tim-qwen3.6-27b`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Subconscious — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://api.subconscious.dev/v1/models`, HTTP 200, 4 models, 2026-09-29 — no key used                                                                                                                                                                                                                                           |
| Route check               | unauthenticated `GET https://api.subconscious.dev/v1/chat/completions` answered HTTP 405 with `allow: POST`, 2026-09-29; no `POST` was sent                                                                                                                                                                                                          |
| Billing                   | public pages read without an account: the [cloud API](https://docs.subconscious.dev/ways-to-use/cloud-api) page and the [pricing](https://www.subconscious.dev/pricing) page. The GLM-5.2 launch post (June 22, 2026) says "You also get $50 credits to test the model performance"; no account was created, so that offer was not tried, 2026-09-29 |
| Error statuses            | the [OpenAPI spec](https://docs.subconscious.dev/api-reference/openapi.json) lists 401 "Unauthorized because of a missing or invalid API key" and 429 "Rate limited due to too many requests or tokens per minute"; `errorRules` match on status alone and were not probed live                                                                      |
| Tools / structured output | declared `false`; nothing was exercised live                                                                                                                                                                                                                                                                                                         |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. To run it: `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=subconscious` with a real key, then record the result.                                                                                                                                                                    |

---

## Error statuses

The OpenAPI spec (https://docs.subconscious.dev/api-reference/openapi.json)
lists these responses for `/chat/completions`:

| Status | Vendor description                                           | NeuroLink class   |
| ------ | ------------------------------------------------------------ | ----------------- |
| 400    | Bad request due to invalid parameters or unsupported options | not in errorRules |
| 401    | Unauthorized because of a missing or invalid API key         | `authentication`  |
| 429    | Rate limited due to too many requests or tokens per minute   | `rate-limit`      |
| 500    | Internal server error                                        | not in errorRules |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
