---
title: Pareto Inference Provider Guide
description: Pareto Inference on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `z-ai/glm-5.3-flash`
keywords: pareto, pareto inference, openai-compatible, tier 2, provider setup, glm
---

# Pareto Inference Provider Guide

> **Verification status:** this entry is **docs- and roster-verified only —
> not yet live-verified.** It was onboarded credential-free: no Pareto
> Inference API key was ever created or used. Every field below comes from
> Pareto's public docs (`https://docs.paretoinference.com/`) and an
> **unauthenticated** `GET /v1/models` call (no auth header). No `POST`
> request was ever sent, so no generate, stream, tool-calling or
> structured-output capability has been exercised end to end. Treat
> `capabilities.tools` and `.thinking` as documentation-grade, not
> wire-proven, until `evidence.liveMatrix` is filled in by a live run.

Pareto Inference is a **Tier-2 catalog provider**: OpenAI-wire-compatible
with no behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/pareto-inference.json`) rather than hand-written
code. That file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `pareto-inference`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — "Pareto accepts
  only OpenAI Chat Completions."
- **Base URL**: `https://api.paretoinference.com/v1`
- **Default model**: `z-ai/glm-5.3-flash` (GLM 5.3 Flash; the docs also
  document a bare alias, `glm-5.3-flash`, for the same model)
- **Models in catalog**: 1 — the only model Pareto serves. Confirmed by an
  unauthenticated `GET /v1/models` (no key needed), which returns exactly
  one id.
- **Streaming**: documented (SSE, text in `choices[0].delta.content`, tool
  calls in `choices[0].delta.tool_calls`, terminal `data: [DONE]`) — not
  live-probed.
- **Tool calling**: documented (`tools`, `tool_choice`) but the vendor's own
  request-parameter table hedges it with "Model support can differ," with no
  model-specific confirmation — set to `model-dependent`, not `true`.
- **Structured output**: `response_format` is a documented parameter but
  carries the same "Model support can differ" hedge as `tools`; the catalog
  schema has no `model-dependent` option for this field, so it is set
  `false` rather than asserted from a hedged table. `structuredOutputWithTools`
  is `false` — no combined probe was possible credential-free.
- **Reasoning**: `reasoning_effort` ("Sets the reasoning level") is
  documented as a plain, unhedged request parameter — unlike `tools` /
  `response_format` / `tool_choice` / `logprobs`, it carries no "Model
  support can differ" caveat — the basis for `capabilities.thinking: true`.
- **Vision**: not documented anywhere on the site.
- **Embeddings**: not documented anywhere on the site.
- **Billing**: **no free tier.** A payment card and prepaid credits are
  required before a key is issued.
- **Signup**: `https://paretoinference.com/dashboard`
- **Key format**: none declared.
- **Data handling**: Pareto documents zero data retention (ZDR) — request
  content is not kept after a request finishes.

---

## Quick Start

### 1. Get an API key

1. Visit: https://paretoinference.com/dashboard and sign in
2. Add a payment card — Pareto has no free tier; a card and prepaid credits
   are required before a key is issued
   (https://docs.paretoinference.com/pricing)
3. Buy prepaid credits, then create your API key from the dashboard
4. Set `PARETO_INFERENCE_API_KEY` in your `.env` file

### 2. Configure

```bash
export PARETO_INFERENCE_API_KEY=your-api-key
export PARETO_INFERENCE_MODEL=z-ai/glm-5.3-flash      # optional — overrides the default model
export PARETO_INFERENCE_BASE_URL=https://api.paretoinference.com/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "pareto-inference",
  model: "z-ai/glm-5.3-flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider pareto-inference
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "pareto-inference",
  credentials: {
    "pareto-inference": { apiKey: process.env.PARETO_INFERENCE_API_KEY },
  },
});
```

---

## Models

| Model                   | Context   | Vision | $/M in · out · cached         | Notes                                                                                                                                                                                                                                       |
| ----------------------- | --------- | ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `z-ai/glm-5.3-flash` ⭐ | 131,072\* | no     | $0.09 / $0.30 (cached $0.018) | Only model Pareto serves. Max output documented as 1–131,072 tokens (default 131,072). \*Context window is not published by Pareto — this figure reuses the documented output ceiling as a conservative floor, not a stated context length. |

\* Pareto's own docs state it does **not** disclose GLM 5.3 Flash's serving
details ("We do not disclose the technical details of our GLM 5.3 Flash
serving system"), and no context-window number appears on any public page.
`models.defaultContextWindow` (131,072) is therefore the documented
**output** ceiling reused as a floor, flagged in the catalog entry's
description — correct it once Pareto publishes a real figure or an
authenticated probe reveals one.

**Fallback order:** none — `z-ai/glm-5.3-flash` is the only model Pareto
serves, so it is both the default and its own (schema-exempt) single-entry
fallback list.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Pareto Inference — and, just as importantly, what it
does **not** yet record:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | **unauthenticated** GET `/v1/models`, HTTP 200, 1 model (`z-ai/glm-5.3-flash`), 2026-09-28. No API key was used or required for this call.                                                                                                                                                                                                                                                         |
| Auth rejection        | Not probed. Would require a `POST` with an invalid key, which this credential-free onboarding pass does not send. Pareto's docs describe 401 as "the chat API key is missing, invalid, or no longer active," with no example error body.                                                                                                                                                           |
| Live capability sweep | **Not run.** `evidence.liveMatrix` is `null`. `capabilities.tools` and `.thinking` are set from the vendor's own request-parameter table and its hedging language, not from an executed chat/stream/tool-call/schema request. `structuredOutput` and `toolsWithStreaming` are `false` because the same table hedges `response_format` and streamed tool calls with "Model support can differ" too. |

Until a live run fills in `evidence.liveMatrix`, treat this provider as
**documentation-grade**: the wire shape (base URL, auth header, request/
response field names) is well-documented and consistent with the standard
OpenAI-compatible contract, but no NeuroLink call has actually exercised it.

---

## Troubleshooting

| Symptom                                 | Cause                                                                | Fix                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid Pareto Inference API key`      | `PARETO_INFERENCE_API_KEY` unset, wrong, or expired                  | Pareto documents 401 as "the chat API key is missing, invalid, or no longer active" — check or replace the key in the dashboard |
| 429 with `credit_exhausted`             | Prepaid balance is empty                                             | Buy more prepaid credits                                                                                                        |
| 429 with `credit_insufficient`          | Held credits (reserved for `max_tokens`) are below what's needed     | Lower `max_tokens`, or buy more credits                                                                                         |
| 429 with `model_capacity`               | The model itself is at capacity — not an account-level limit         | Honor the `Retry-After` header and retry                                                                                        |
| 502 mid-stream                          | The model request failed after the stream started                    | Retry the request; check whether a tool call already ran before retrying                                                        |
| 503                                     | Temporary Pareto-side failure (e.g. maintenance, GPU outage)         | Wait and retry; `Retry-After` gives the delay in seconds                                                                        |
| No context-window figure in the catalog | Pareto does not publish one and declines to disclose serving details | Treat `defaultContextWindow` as a conservative floor, not a hard vendor number, until corrected by a real probe                 |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
