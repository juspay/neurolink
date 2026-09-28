---
title: Featherless AI Provider Guide
description: Featherless AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `unsloth/Llama-3.3-70B-Instruct`
keywords: featherless, featherless ai, openai-compatible, tier 2, provider setup, roleplay, open-weight models
---

# Featherless AI Provider Guide

Featherless AI is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/featherless-ai.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** Every field below comes from Featherless's own published
> docs and an unauthenticated `GET /v1/models` call — no API key was used to
> write this entry, so no request-response wire behavior (streaming, tool
> calling, structured output) has actually been exercised end to end yet. See
> [Verification status](#verification-status) for exactly what was and was
> not checked.

---

## Key Facts

- **Provider id**: `featherless-ai`
- **Protocol**: OpenAI-compatible (`/chat/completions`), per Featherless's own
  docs: _"Featherless's API is designed to be API compatible with OpenAI."_
- **Base URL**: `https://api.featherless.ai/v1`
- **Default model**: `unsloth/Llama-3.3-70B-Instruct`
- **Models in catalog**: 12 (out of a live roster of **22,060** models — see
  [Models](#models) for why these 12)
- **Streaming**: not documented anywhere in Featherless's docs — declared
  `false` until confirmed live
- **Tool calling**: **model-dependent**. Featherless's [Tool Calling
  guide](https://featherless.ai/docs/tool-calling) natively supports only the
  `moonshotai/Kimi-K2-Instruct` and `Qwen 3` model families; other models need
  a prompting workaround the guide documents separately
- **Structured output**: not documented (no `response_format`/JSON-mode
  mention anywhere in the docs checked) — declared `false`
- **Embeddings**: Featherless does document a separate `POST
/v1/embeddings` endpoint for embedding-output models, but that is a distinct
  model family from the chat models in this catalog entry and is not wired
  through this provider — declared `false`
- **Billing**: **no free tier**. Plans start at $25/mo
- **Key format**: none declared by the vendor
- **Gated models**: some roster ids are Hugging-Face-gated and return HTTP 403
  until unlocked manually in the account UI (see
  [Troubleshooting](#troubleshooting))

---

## Quick Start

### 1. Get an API key

1. Visit: https://featherless.ai/register and create an account (or
   https://featherless.ai/login if you already have one)
2. Subscribe to a plan — Chat ($25/mo, unlimited tokens, 32K context) or
   Developer ($50/mo in credits, billed per token, up to 256K context);
   Featherless has no free or keyless tier
3. Generate an API key from the API keys section of your account
4. Set `FEATHERLESS_AI_API_KEY` in your .env file

### 2. Configure

```bash
export FEATHERLESS_AI_API_KEY=your-api-key
export FEATHERLESS_AI_MODEL=unsloth/Llama-3.3-70B-Instruct   # optional — overrides the default model
export FEATHERLESS_AI_BASE_URL=https://api.featherless.ai/v1 # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "featherless-ai",
  model: "unsloth/Llama-3.3-70B-Instruct",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider featherless-ai
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "featherless-ai",
  credentials: {
    "featherless-ai": { apiKey: process.env.FEATHERLESS_AI_API_KEY },
  },
});
```

---

## Models

Featherless's live roster is enormous — 22,060 models as of 2026-09-28,
spanning mainline instruction-tuned checkpoints alongside a very large number
of community roleplay, uncensored and "abliterated" (safety-refusal-removed)
fine-tunes; Featherless's own site markets these as first-class catalog
filters ("LLMs for Roleplay", "Uncensored Models", "Abliterated Models"). This
catalog entry lists 12 models — a bounded, verifiable slice, not the whole
roster — chosen to include the default, its closest official counterpart, and
a representative spread of the architectures Featherless serves (Llama-3.3-70B
family, QRWKV, RWKV5).

| Model                                          | Context | Vision | $/M in · out  | Notes                                                                                                                                                                                        |
| ---------------------------------------------- | ------- | ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unsloth/Llama-3.3-70B-Instruct` ⭐            | 32K     | no     | $2.60 / $3.00 | Recommended — an ungated community re-upload of Meta's Llama 3.3 70B Instruct. Chosen as default because the official `meta-llama` id is gated (see below). Roster reports `tool_use: true`. |
| `meta-llama/Llama-3.3-70B-Instruct`            | 32K     | no     | $0.65 / $0.75 | Meta's official weights. Hugging-Face-gated on Featherless (HTTP 403 until unlocked in the account UI) — kept as a fallback, not the default.                                                |
| `Sao10K/L3.3-70B-Euryale-v2.3`                 | 32K     | no     | $0.65 / $0.75 | Roleplay/long-form-writing Llama-3.3-70B fine-tune. Not gated; roster-listed only.                                                                                                           |
| `EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.0`          | 32K     | no     | $2.60 / $3.00 | Creative-writing/roleplay Llama-3.3-70B fine-tune. Not gated; roster-listed only.                                                                                                            |
| `EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.1`          | 32K     | no     | $2.60 / $3.00 | Later revision of the EVA-LLaMA line above. Not gated; roster-listed only.                                                                                                                   |
| `KaraKaraWitch/Llama-MiraiFanfare-3.3-70B`     | 32K     | no     | $2.60 / $3.00 | Community Llama-3.3-70B fine-tune. Not gated; roster-listed only.                                                                                                                            |
| `huihui-ai/Llama-3.3-70B-Instruct-abliterated` | 32K     | no     | $0.65 / $0.75 | Safety-refusal-ablated Llama 3.3 70B Instruct. Not gated; roster-listed only.                                                                                                                |
| `recursal/QRWKV6-32B-Instruct-Preview-v0.1`    | 32K     | no     | $0.27 / $0.65 | Non-transformer RWKV-hybrid architecture; one of the few model classes Featherless's docs call out at the 32K context tier. Not gated; roster-listed only.                                   |
| `RWKV/v6-Finch-14B-HF`                         | 16K     | no     | $0.11 / $0.28 | RWKV v6 "Finch" 14B, non-transformer architecture. Not gated; roster-listed only.                                                                                                            |
| `RWKV/EagleX-7B-Chat-V0.5-pth`                 | 16K     | no     | $0.10 / $0.20 | Early RWKV5-architecture chat checkpoint. Not gated; roster-listed only.                                                                                                                     |
| `recursal/EagleX_1-7T_Chat`                    | 16K     | no     | $0.10 / $0.20 | RWKV5-architecture, chat-tuned. Not gated; roster-listed only.                                                                                                                               |
| `recursal/EagleX_1-7T`                         | 16K     | no     | $0.10 / $0.20 | RWKV5-architecture base checkpoint (non-chat-tuned). Not gated; roster-listed only.                                                                                                          |

Context window and pricing come directly from the live, unauthenticated
`GET /v1/models` response (`context_length`, `pricing.input`/`pricing.output`,
already expressed as $ per million tokens) fetched 2026-09-28 — not from
invented numbers. Featherless does not document a per-request output-token
ceiling anywhere in its docs (`max_tokens` is described only as "Maximum
number of tokens generated per output sequence", with no number given), so
`defaultMaxOutputTokens` (4096) follows the same conservative,
undocumented-cap convention already used by several other catalog entries
(Fireworks, Groq, Mistral, Novita, Perplexity, Together AI, xAI) rather than a
Featherless-specific figure.

**Fallback order** when the default is unavailable:
`meta-llama/Llama-3.3-70B-Instruct` → `Sao10K/L3.3-70B-Euryale-v2.3` →
`EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.0` → `EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.1`
→ `KaraKaraWitch/Llama-MiraiFanfare-3.3-70B` →
`huihui-ai/Llama-3.3-70B-Instruct-abliterated` →
`recursal/QRWKV6-32B-Instruct-Preview-v0.1` → `RWKV/v6-Finch-14B-HF` →
`RWKV/EagleX-7B-Chat-V0.5-pth` → `recursal/EagleX_1-7T_Chat` →
`recursal/EagleX_1-7T`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This entry was built
**entirely credential-free** — no signup, no API key, no POST request to
Featherless was made — so it records what a public, unauthenticated pass can
prove and nothing more:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated `GET /v1/models`, HTTP 200, 22,060 models, 2026-09-28                                                                                                                                                                                                                                                                                 |
| Billing               | unauthenticated `GET https://featherless.ai/pricing`, HTTP 200, 2026-09-28 — no free tier found anywhere on the page; plans start at $25/mo                                                                                                                                                                                                           |
| Auth rejection        | **not probed** — would require a POST request, which credential-free onboarding does not permit                                                                                                                                                                                                                                                       |
| Live capability sweep | **not run** (`evidence.liveMatrix` is `null`) — chat, streaming, tool calling and structured output are all unverified against a real request                                                                                                                                                                                                         |
| Docs pages read       | Overview, API overview and common options, Completions (`/v1/chat/completions` and `/v1/completions`), Quickstart guide, API examples and snippets, Tool Calling, Embeddings, Vision, Chat template kwargs, Models & Model Compatibility, Error codes, Pricing — none of these documents `response_format` or `stream:true` for chat/text completions |

Because of this, `capabilities.streaming`, `capabilities.structuredOutput`,
and `capabilities.structuredOutputWithTools` are all conservatively `false`,
and `capabilities.tools` is `"model-dependent"` (Featherless's own Tool
Calling guide frames it that way, naming only `moonshotai/Kimi-K2-Instruct`
and the `Qwen 3` family as natively supported). A live-verification pass with
a real API key — `npx tsx test/continuous-test-suite-provider-matrix.ts
--provider=featherless-ai` — is required before any of these flags should be
promoted, per
[Tier-2 onboarding: Live verification](/docs/provider-integration/tiers/tier-2-catalog-entry#live-verification).

---

## Troubleshooting

| Symptom                                     | Cause                                                                                               | Fix                                                                                                                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid Featherless API key`               | `FEATHERLESS_AI_API_KEY` unset or wrong                                                             | Check the key in your Featherless account at https://featherless.ai/register                                                                                                |
| HTTP 403, "model is gated"                  | The requested model (e.g. `meta-llama/Llama-3.3-70B-Instruct`) is Hugging-Face-gated on Featherless | Open the model's page on featherless.ai while signed in and click "Unlock Model" to accept its license, or use the ungated `unsloth/Llama-3.3-70B-Instruct` default instead |
| Model not found                             | The roster changed since 2026-09-28, or the id was mistyped                                         | Pick a current id from the unauthenticated `GET /v1/models` roster or https://featherless.ai/models                                                                         |
| HTTP 400, "This Model is Cold"              | Featherless documents cold/loading/warm model states; a cold model needs to load                    | Retry — warm-up can take from a few minutes up to an hour for very large models, per Featherless's error-codes page                                                         |
| HTTP 503, "Service Temporarily Unavailable" | Featherless documents this as insufficient capacity, not downtime                                   | Retry the same request; Featherless's own guidance is to retry up to three times                                                                                            |
| Unexpected billing                          | No free or keyless tier exists                                                                      | Confirm plan choice at https://featherless.ai/#pricing before heavy use — Chat is a flat $25/mo, Developer is metered credits                                               |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
