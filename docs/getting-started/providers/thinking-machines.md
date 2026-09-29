---
title: Thinking Machines Provider Guide
description: Thinking Machines (Tinker) on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `moonshotai/Kimi-K2.6`
keywords: thinking-machines, tinker, openai-compatible, tier 2, provider setup, kimi
---

# Thinking Machines Provider Guide

Thinking Machines is a **Tier-2 catalog provider**: OpenAI-wire-compatible with
no behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/thinking-machines.json`) rather than hand-written
code. That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET /models` needs a key (an unauthenticated
> GET answered HTTP 401), so the model ids come from the vendor's public
> [Models & Pricing page](https://tinker-docs.thinkingmachines.ai/tinker/models/)
> and the roster has not been checked. No API key was created or used to build
> this entry. `evidence.liveMatrix` is `null` until someone runs the live
> capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `thinking-machines` (alias `tinker`)
- **Protocol**: OpenAI-compatible (`/chat/completions`). The vendor's
  [OpenAI-compatible page](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/)
  is titled "OpenAI API Compatible Inference (in beta)" and says "We support
  both /completions and /chat/completions endpoints."
- **Base URL**: `https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1`
- **Default model**: `moonshotai/Kimi-K2.6`
- **Models in catalog**: 12 rows of the Training table on the
  [Models & Pricing page](https://tinker-docs.thinkingmachines.ai/tinker/models/),
  listed under [Models](#models)
- **Vendor scope statement**: "Currently, OpenAI-compatible inference is meant
  for testing and internal use with low internal traffic, rather than large,
  high-throughput, user-facing deployments." (OpenAI-compatible page)
- **Streaming**: `true` — the OpenAI-compatible page says "In streaming mode,
  reasoning_content and content arrive on separate SSE events"
- **Thinking**: `true` — the OpenAI-compatible page documents a `separate_reasoning`
  flag and a `reasoning_effort` parameter on `/chat/completions`, and says of
  the latter "Not all models support this parameter."
- **Tool calling**: not declared (`false`). With `false`, the provider's
  `supportsTools()` answers false, so no `tools` array is sent
- **Structured output**: not declared (`false`)
- **Structured output + tools together**: not declared (`false`) — no POST
  request was sent
- **Embeddings**: not declared (`false`)
- **Billing**: the catalog field holds `no-free-tier`, a schema placeholder (the
  schema has no unknown value), not a vendor statement; see
  [Billing](#billing) for what the vendor says
- **Key format**: none declared, so NeuroLink applies no key-format check

---

## Quick Start

### 1. Get an API key

1. Visit: https://tinker.thinkingmachines.ai/keys — the [Quickstart](https://tinker-docs.thinkingmachines.ai/tinker/quickstart/) says "Or create an API key in the Tinker Console and set it as the TINKER_API_KEY environment variable." An unauthenticated GET of that URL redirects to a page titled "Sign in" (sign-in was not attempted while building this entry)
2. Authentication as the vendor states it: the OpenAI-compatible page says "Authenticate with your Tinker API key, by passing the same key used for Tinker as the API key to the OpenAI client." Its code example reads the key from `TINKER_API_KEY`
3. Billing as the vendor states it: see [Billing](#billing)
4. Set `THINKING_MACHINES_API_KEY` in your .env file (the vendor's examples read `TINKER_API_KEY`, which NeuroLink accepts as a fallback)

### 2. Configure

```bash
export THINKING_MACHINES_API_KEY=your-api-key
export THINKING_MACHINES_MODEL=moonshotai/Kimi-K2.6   # optional — overrides the default model
export THINKING_MACHINES_BASE_URL=https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "thinking-machines",
  model: "moonshotai/Kimi-K2.6",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider thinking-machines
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "thinking-machines",
  credentials: {
    thinkingMachines: { apiKey: process.env.THINKING_MACHINES_API_KEY },
  },
});
```

### Sampler checkpoints

The OpenAI-compatible page says "Use a Tinker sampler weight path as the model
name." and shows a path that begins with `tinker://`. A `tinker://` path passed
as `model` is an id outside the catalog, so it uses `models.defaultContextWindow`
(32768) and `models.defaultMaxOutputTokens` (8192).

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "thinking-machines",
  model: "tinker://<your-sampler-checkpoint-path>",
});
```

---

## Billing

The vendor's Quickstart says: "Set up payment info in Billing, and see Models &
Pricing for current training and sampling rates." The Billing link goes to
https://tinker.thinkingmachines.ai/billing/; an unauthenticated GET of it
redirects to the same "Sign in" page as the keys URL. The Models & Pricing page
says "All prices are per million tokens." The catalog's `billingPolicy` field
holds `no-free-tier` only because the schema requires one of three values; it is
not a vendor statement.

---

## Models

| Model                                           | Context | Vision       | $/M in · out (cached in) | Vendor type     | Notes                                                                                                     |
| ----------------------------------------------- | ------- | ------------ | ------------------------ | --------------- | --------------------------------------------------------------------------------------------------------- |
| `moonshotai/Kimi-K2.6` ⭐                       | 32,768  | not declared | $2.205 / $5.49 ($0.441)  | Hybrid + Vision | NeuroLink default. Named in the OpenCode tutorial's "Using a base model (no fine-tuning)" section.        |
| `Qwen/Qwen3.8-27B`                              | 65,536  | not declared | $1.86 / $5.595 ($0.372)  | Hybrid + Vision | Fallback. Listed under "Recommended replacement" for Qwen3.6-27B.                                         |
| `Qwen/Qwen3.6-35B-A3B`                          | 65,536  | not declared | $0.54 / $1.335 ($0.108)  | Hybrid + Vision | Listed under "Recommended replacement" for Qwen3.5-35B-A3B and Qwen3-30B-A3B.                             |
| `Qwen/Qwen3.5-397B-A17B`                        | 65,536  | not declared | $3.00 / $7.50 ($0.60)    | Hybrid + Vision | Listed under "Recommended replacement" for Qwen3-235B-A22B-Instruct-2507 and Qwen3-VL-235B-A22B-Instruct. |
| `Qwen/Qwen3.5-9B`                               | 65,536  | not declared | $0.66 / $1.995 ($0.132)  | Hybrid + Vision | Listed under "Recommended replacement" for Llama-3.1-8B-Instruct.                                         |
| `Qwen/Qwen3.5-4B`                               | 65,536  | not declared | $0.33 / $1.005 ($0.066)  | Hybrid + Vision | Listed under "Recommended replacement" for Qwen3-4B-Instruct-2507.                                        |
| `Qwen/Qwen3-8B`                                 | 32,768  | not declared | $0.195 / $0.60 ($0.039)  | Hybrid          | Fallback. Named on the Anthropic-Compatible API page, which documents a separate endpoint.                |
| `openai/gpt-oss-120b`                           | 32,768  | not declared | $0.33 / $0.84 ($0.066)   | Reasoning       | Fallback.                                                                                                 |
| `openai/gpt-oss-20b`                            | 32,768  | not declared | $0.18 / $0.45 ($0.036)   | Reasoning       | Listed in the Training table.                                                                             |
| `deepseek-ai/DeepSeek-V3.1`                     | 32,768  | not declared | $1.695 / $4.215 ($0.339) | Hybrid          | Listed in the Training table.                                                                             |
| `zai-org/GLM-5.3:peft:262144`                   | 262,144 | not declared | $4.86 / $12.15 ($0.972)  | Reasoning       | The table row is named "GLM-5.3 (256K)".                                                                  |
| `nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16` | 65,536  | not declared | $0.57 / $1.44 ($0.114)   | Hybrid          | Row note "Limited-time 50% discount"; the page shows Prefill $1.14 and Sample $2.88 struck through.       |

Context, prices and vendor type come from the Training table on the
[Models & Pricing page](https://tinker-docs.thinkingmachines.ai/tinker/models/)
(retrieved 2026-09-29; the same data is published as
[models.json](https://tinker-docs.thinkingmachines.ai/tinker/models.json)).
Input is the Prefill column, output is the Sample column and the figure in
brackets is the cached Prefill price; the page's Pricing Terms define Prefill as
"Processing input/prompt tokens when sampling" and Sample as "Generating output
tokens". Context is the table's label read with K = 1024 (the same table labels
the id suffixes `:peft:131072` and `:peft:262144` as 128K and 256K).

`models.defaultContextWindow` (32768) is the figure in the OpenCode tutorial's
[Config fields table](https://tinker-docs.thinkingmachines.ai/tutorials/deployment/opencode/):
"Max input tokens (32768 for most Tinker models)".
`models.defaultMaxOutputTokens` (8192) is the `"output"` figure in both example
configs of that tutorial, whose Config fields table describes `limit.output` as
"Max output tokens". The catalog rows do not set `maxOutputTokens`, so the
default applies to them.

**Model ids:** `moonshotai/Kimi-K2.6` is the catalog id that the OpenCode
tutorial shows as a models entry under its "Using a base model (no fine-tuning)"
heading. The other eleven catalog ids are Tinker IDs from the Models & Pricing
Training table. The verification level is docs-verified, not yet live-verified.

**Vision:** `not declared` means the entry sets `vision` to `false`: image input
through `/chat/completions` is not declared by this entry. The Vendor type
column shows the Training table's Type label, and the Model Types section
describes Vision models as "Vision-language models that accept images alongside
text."

**Status:** the rows' `status` is `preview`, following the OpenAI-compatible
page's "(in beta)" title. The catalog schema requires a value; it is not a
per-model vendor statement.

**Fallback order** when the default is unavailable:
`Qwen/Qwen3.8-27B` → `openai/gpt-oss-120b` → `Qwen/Qwen3-8B`. The runtime
fallback model name the loader derives (`fallbacks[1]`) is `openai/gpt-oss-120b`.

**Retirements:** the vendor's
[Model Deprecations page](https://tinker-docs.thinkingmachines.ai/tinker/model-deprecations/)
says "Avoid building hard dependencies on any specific model, as models may be
updated, replaced, or removed over time."

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Thinking Machines — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                    | unauthenticated `GET /models` answers HTTP 401 without a key (2026-09-29), so the twelve model ids are taken from the Models & Pricing page and the roster has not been checked                                                      |
| Endpoint shape            | unauthenticated `GET /chat/completions` answered HTTP 405 with header `allow: POST` and body `{"detail":"Method Not Allowed"}`; the base URL itself answered HTTP 404 with body `{"detail":"Not Found"}`; no POST request was sent   |
| Auth-failure shape        | unauthenticated `GET /models` answered HTTP 401, content-type `application/json`, body `{"detail":"X-Api-Key token is empty"}`; the body has no code field, so no code is recorded and `errorRules` holds one rule, for status `401` |
| Billing                   | the Quickstart's Billing section, quoted under [Billing](#billing); no signup was performed                                                                                                                                          |
| Tools / structured output | not declared; no POST request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                   |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=thinking-machines` with a real key and record the result.     |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row below is a statement from the vendor's own pages.

| Symptom                                         | What the vendor says                                                                                                                                                                                                      | Source                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| HTTP 400 when a request sets `reasoning_effort` | "Not all models support this parameter. Requests against a model that doesn't support it return HTTP 400."                                                                                                                | [OpenAI-compatible page](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/) |
| Reasoning trace missing from `content`          | "separate_reasoning defaults to true; set it to false to keep the reasoning trace inlined in content."                                                                                                                    | [OpenAI-compatible page](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/) |
| Prompt formatting differs from the checkpoint   | On `/chat/completions` "the server renders them with the model’s default Hugging Face chat template"; "If your checkpoint expects a different renderer, render the prompt to token IDs yourself"                          | [OpenAI-compatible page](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/) |
| Latency or throughput varies                    | "Latency and throughput may vary by model and may change without notice during the beta." and "If you need higher or more stable throughput, contact the Tinker team in our Discord for guidance on larger-scale setups." | [OpenAI-compatible page](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/) |
| A model id is no longer served                  | "Switch to the recommended replacements listed below for any deprecated models."                                                                                                                                          | [Model Deprecations page](https://tinker-docs.thinkingmachines.ai/tinker/model-deprecations/)    |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
