---
title: EmpirioLabs AI Provider Guide
description: EmpirioLabs AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `glm-5-3` (docs- and roster-verified; not yet live-verified)
keywords: empiriolabs, empiriolabs ai, openai-compatible, tier 2, provider setup, glm
---

# EmpirioLabs AI Provider Guide

EmpirioLabs AI is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/empiriolabs.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status: docs- and roster-verified, not yet live-verified.**
> This entry was onboarded credential-free — no API key was created and no
> chat, streaming or tool-call request was ever sent. Everything below comes
> from the vendor's own public docs (docs.empiriolabs.ai) and an
> **unauthenticated** `GET /v1/models` call. `evidence.liveMatrix` is `null`
> in the catalog file until someone runs the live capability sweep with a
> real key (see [Live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification)).

---

## Key Facts

- **Provider id**: `empiriolabs`
- **Protocol**: OpenAI-compatible (`/v1/chat/completions`) — confirmed on
  docs.empiriolabs.ai: "Accepts the same request body as the OpenAI Chat
  Completions API."
- **Base URL**: `https://api.empiriolabs.ai/v1`
- **Default model**: `glm-5-3` (Zhipu GLM-5.3 — marked `is_featured: true` on
  the live roster)
- **Models in catalog**: 6 (curated text/chat subset of a 217-model roster
  that also spans vision, audio, video, image and 3D generation)
- **Streaming**: documented as a supported request parameter (`stream`); not
  live-probed
- **Tool calling**: `model-dependent` — the roster's own `features` field
  marks `function_calling` on 97 of 217 models, not all of them
- **Structured output**: `model-dependent` per the vendor's docs
  ("`json_schema` means strict schema support, `json_object` means JSON mode
  only... check via `GET /v1/models/{modelId}`"); the default model
  (`glm-5-3`) documents `json_object` support, so the provider-level flag is
  `true`
- **Structured output + tools together**: not declared — no combined probe
  was possible without a key
- **Embeddings**: not supported by this integration (the vendor does list a
  separate embedding-model family, but NeuroLink's generic OpenAI-compatible
  catalog provider does not implement `embed()`/`embedMany()`)
- **Billing**: free-tier — pricing page: "$0 to start... No subscription
  needed", with several models marked "Free" at $0 input/output/cache cost.
  Getting-started docs also list prepaid credits as a prerequisite for
  non-free models, so budget for that before heavy use.
- **Key format**: keys use the `sk-empiriolabs-` prefix (documented)

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.empiriolabs.ai and create an account
2. Create an API key from the dashboard (keys use the `sk-empiriolabs-`
   prefix, up to 50 per account)
3. Selected models (e.g. GLM 4.7 Flash) run at $0 cost; other models draw
   from prepaid credits topped up via the dashboard Billing page — confirm
   current pricing before heavy use
4. Set `EMPIRIOLABS_API_KEY` in your .env file

### 2. Configure

```bash
export EMPIRIOLABS_API_KEY=sk-empiriolabs-your-api-key
export EMPIRIOLABS_MODEL=glm-5-3      # optional — overrides the default model
export EMPIRIOLABS_BASE_URL=https://api.empiriolabs.ai/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "empiriolabs",
  model: "glm-5-3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider empiriolabs
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "empiriolabs",
  credentials: { empiriolabs: { apiKey: process.env.EMPIRIOLABS_API_KEY } },
});
```

---

## Models

| Model                    | Context | Max out | Vision | Structured output | $/M in · out (cached)   | Notes                                                                                                   |
| ------------------------ | ------- | ------- | ------ | ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `glm-5-3` ⭐             | 1M      | 131,072 | no     | `json_object`     | $1.40 / $4.40 ($1.40)   | Recommended — roster `is_featured: true`; reasoning, function calling, web search.                      |
| `glm-5-3-flash`          | 1M      | 131,072 | yes    | `json_object`     | $0.075 / $0.25 ($0.075) | Lighter/cheaper sibling; also vision (`document_understanding`, `video_understanding`); fallback.       |
| `glm-5-2`                | 1M      | 131,072 | no     | `json_object`     | $1.40 / $4.40 ($1.40)   | Prior GLM generation; fallback.                                                                         |
| `kimi-k3`                | 1M      | 131,072 | yes    | `json_schema`     | $3.00 / $15.00 ($3.00)  | Moonshot Kimi K3 — multimodal, agentic coding; strict schema output; fallback.                          |
| `qwen3-7-max`            | 1M      | 65,536  | no     | `json_schema`     | $2.50 / $7.50 ($2.50)   | Alibaba flagship reasoning model with code interpreter; lower max output than the GLM family; fallback. |
| `minimax-m2-7-highspeed` | 200K    | 32,768  | no     | `json_object`     | $0.30 / $1.20 ($0.03)   | Smallest context/output in this set; lightest/cheapest fallback.                                        |

All context, output, pricing and structured-output values above are read
directly from the unauthenticated `GET https://api.empiriolabs.ai/v1/models`
response (2026-09-28), not invented or estimated. This 6-model set is a
curated subset — the full roster returned 217 ids spanning text, vision,
audio, video, image and 3D-generation models; only text/chat-completions
models with documented `function_calling` are catalogued here.

**Fallback order** when the default is unavailable: `glm-5-3-flash` →
`glm-5-2` → `kimi-k3` → `qwen3-7-max` → `minimax-m2-7-highspeed`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for EmpirioLabs AI:

| Probe                 | Result                                                                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | **unauthenticated** `GET /v1/models`, HTTP 200, 217 models, 2026-09-28. No API key was created or used.                                                                                                                                           |
| Auth rejection        | Not probed (would require a key). Documented shape only: `docs.empiriolabs.ai/authentication` states a missing/malformed/unknown token returns `401 Unauthorized`.                                                                                |
| Wire compatibility    | Documented only: `docs.empiriolabs.ai/compatibility` states the endpoint "accepts the same request body as the OpenAI Chat Completions API" and lists `messages`, `model`, `stream`, `temperature`, `max_tokens`, `response_format` as supported. |
| Live capability sweep | **Not run.** `evidence.liveMatrix` is `null`. No chat, streaming, tool-call or structured-output request has been sent to this vendor.                                                                                                            |

Because no live probe was possible, `capabilities.toolsWithStreaming` and
`capabilities.structuredOutputWithTools` are conservatively `false`, and
`capabilities.tools` is `"model-dependent"` rather than an unqualified
`true` — the roster shows `function_calling` on 97 of 217 models, not the
whole catalog. Whoever runs the live matrix next should re-check these flags
against real responses, per
[Live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification).

---

## Documented quirks worth knowing (not catalog quirks)

- **Implicit system prompt**: EmpirioLabs docs say every chat model has a
  built-in identity message that is prepended automatically when your
  request has no `system`/`developer` role message. Supplying your own
  system message fully replaces it (no merging). This doesn't require a
  named catalog `quirks` entry — it only changes behavior when you omit a
  system message — but it's worth knowing if a completion reads oddly
  "in character."
- **`response_format` is per-model**: sending a structured-output format a
  model doesn't support returns `HTTP 400` per the vendor's docs. Check
  `GET /v1/models/{modelId}` for a given model's `structured_output` value
  (`json_schema`, `json_object`, or absent) before relying on it.

---

## Troubleshooting

| Symptom                                                | Cause                                                                 | Fix                                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `Invalid EmpirioLabs API key`                          | `EMPIRIOLABS_API_KEY` unset or wrong                                  | Check the key at https://platform.empiriolabs.ai                                  |
| `401 Unauthorized`                                     | Token missing, malformed, or not found (per vendor docs)              | Confirm the header is `Authorization: Bearer sk-empiriolabs-...`                  |
| `402 Payment Required` (documented, not live-verified) | Account has insufficient prepaid credits                              | Top up credits via the dashboard Billing page, or pick a $0 free model            |
| `429 Too Many Requests`                                | Rate limit exceeded (new accounts: 50 RPM / 2,000,000 TPM)            | Retry with exponential backoff, or email support@empiriolabs.ai for higher limits |
| `HTTP 400` on `response_format`                        | The chosen model doesn't support the requested structured-output mode | Check `GET /v1/models/{modelId}` for that model's `structured_output` value       |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration, including the live-verification steps this entry still needs
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
