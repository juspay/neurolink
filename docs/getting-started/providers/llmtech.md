---
title: LLM Tech Provider Guide
description: LLM Tech on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `nvidia/Qwen3.8-27B-NVFP4`
keywords: llmtech, llm tech, openai-compatible, tier 2, provider setup, qwen
---

# LLM Tech Provider Guide

> **Verification status:** this entry is **docs- and roster-verified only —
> not yet live-verified.** It was onboarded credential-free: no LLM Tech API
> key was ever created or used. Every field below comes from LLM Tech's
> public model page (`https://llmtech.eu/models/qwen3.8-27b`) and an
> **unauthenticated** `GET /v1/models` call (no auth header, no key). No
> `POST` request was ever sent, so no generate, stream, tool-calling or
> structured-output capability has been exercised end to end. Treat
> `capabilities.tools`, `.structuredOutput` and `.thinking` as
> documentation-grade, not wire-proven, until `evidence.liveMatrix` is filled
> in by a live run.

LLM Tech is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/llmtech.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `llmtech`
- **Protocol**: OpenAI-compatible (`/v1/chat/completions`). The vendor's own
  quickstart uses the OpenAI SDK's `client.chat.completions.create(...)`
  against this base URL.
- **Base URL**: `https://api.llmtech.eu/v1`
- **Default model**: `nvidia/Qwen3.8-27B-NVFP4`
- **Models in catalog**: 1 — LLM Tech's entire hosted roster, confirmed by an
  unauthenticated `GET /v1/models` (HTTP 200, exactly 1 model) re-run on
  2026-09-28.
- **Hosting**: self-hosted on EU hardware — GPU node in Italy, edge network
  in Nuremberg.
- **Streaming**: documented (`SSE, OpenAI format`, `stream=True` in the
  vendor's sample) — not live-probed.
- **Tool calling**: documented ("yes, with structured outputs") and the
  model's own `features` array on the live `/v1/models` response lists
  `tools` — not live-probed.
- **Structured output**: the model's `features` array lists `json_mode` and
  `structured_outputs`; the vendor's docs mention structured outputs only in
  the same tool-calling sentence, with no separate `response_format`
  wire example — not live-probed. Combining `tools` with a JSON schema in one
  request is not documented either way, so `structuredOutputWithTools` is
  declared `false` until a combined probe is run.
- **Embeddings**: not documented anywhere on the vendor's site.
- **Vision**: real image support, not a text-only model despite some
  third-party listings — the vendor's page states the vision tower is kept
  in BF16 and works; image tokens count toward `prompt_tokens` and bill at
  the input rate (e.g. a 64×64 PNG costs 64 image tokens), and images must go
  in a user message, not a system message. The live roster's `features`
  array also lists `vision`. Not live-probed.
- **Reasoning / thinking**: controllable via `enable_thinking` and
  `reasoning_effort` request parameters; the live roster's `features` array
  lists `reasoning`.
- **Billing**: pay-per-token USD, **no free tier documented** — "no
  subscription, no minimums." Prompt caching is automatic and billed at the
  cache rate.
- **Signup**: **no public signup or self-service key page.** Self-service is
  described as "planned." Keys are issued manually by emailing
  `artem@llmtech.eu`; the account dashboard at `https://llmtech.eu/cabinet/`
  confirms this model — "your key is your login," "we hold no passwords and
  no accounts" — it is a billing/usage view for an existing key, not a
  signup form.
- **Key format**: none declared.

---

## Quick Start

### 1. Get an API key

LLM Tech does not publish a public signup or self-service key-issuance flow:

1. Email `artem@llmtech.eu` to request a key (self-service is planned but not
   live as of 2026-09-28).
2. Once issued, paste the key into `https://llmtech.eu/cabinet/` to see
   current-month billing, a daily usage chart, and invoice line items — there
   is no separate account or login.
3. Confirm current pricing before heavy use: input $0.25/M, output $2.09/M,
   cached input $0.04/M tokens, per `https://llmtech.eu/models/qwen3.8-27b`.
4. Set `LLMTECH_API_KEY` in your `.env` file.

### 2. Configure

```bash
export LLMTECH_API_KEY=your-api-key
export LLMTECH_MODEL=nvidia/Qwen3.8-27B-NVFP4      # optional — overrides the default model
export LLMTECH_BASE_URL=https://api.llmtech.eu/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain NVFP4 quantization in one paragraph." },
  provider: "llmtech",
  model: "nvidia/Qwen3.8-27B-NVFP4",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider llmtech
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "llmtech",
  credentials: { llmtech: { apiKey: process.env.LLMTECH_API_KEY } },
});
```

---

## Models

| Model                         | Context | Vision | $/M in · out                 | Notes                                                                                                        |
| ----------------------------- | ------- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `nvidia/Qwen3.8-27B-NVFP4` ⭐ | 262,144 | yes    | $0.25 / $2.09 (cached $0.04) | LLM Tech's only model. Reasoning-capable via `enable_thinking`/`reasoning_effort`. Max output 32,768 tokens. |

Context window and max output shown are the catalog defaults (262,144 /
32,768 tokens), taken directly from the model's own entry in the live,
unauthenticated `GET /v1/models` response (`context_length`, `max_output` /
`max_output_tokens`) on 2026-09-28. Pricing is that same response's
`pricing_per_m` fields, which match the vendor's model page exactly.

**Fallback order:** none — `nvidia/Qwen3.8-27B-NVFP4` is the only model LLM
Tech serves, so it is both the default and its own (schema-exempt)
single-entry fallback list.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for LLM Tech — and, just as importantly, what it does **not**
yet record:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | **unauthenticated** GET `/v1/models`, HTTP 200, 1 model, 2026-09-28. No API key was used or required for this call.                                                                                                                                                                                                                                                                                                         |
| Auth rejection        | Not probed. Would require a `POST` with an invalid key, which this credential-free onboarding pass does not send.                                                                                                                                                                                                                                                                                                           |
| Live capability sweep | **Not run.** `evidence.liveMatrix` is `null`. `capabilities.tools`, `.structuredOutput`, `.thinking` and vision are set from the vendor's model page plus the served model's own `features` array on the live roster — not from an executed chat/stream/tool-call/schema request. `structuredOutputWithTools` and `toolsWithStreaming` are `false` because no combined request was — or could be — attempted without a key. |

Until a live run fills in `evidence.liveMatrix`, treat this provider as
**documentation-grade**: the wire shape (base URL, OpenAI-compatible request/
response field names) is well-documented, but no NeuroLink call has actually
exercised it.

---

## Troubleshooting

| Symptom                      | Cause                                             | Fix                                                                                                         |
| ---------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Invalid LLM Tech API key`   | `LLMTECH_API_KEY` unset or wrong                  | LLM Tech's docs do not publish an example auth-error body or code string; re-check the key with your issuer |
| Model not found              | The roster changed since 2026-09-28               | Re-check with an unauthenticated `GET https://api.llmtech.eu/v1/models`                                     |
| No signup page found         | Expected — LLM Tech has no public signup page yet | Email `artem@llmtech.eu` for a key; self-service is planned but not live                                    |
| Unexpectedly high image cost | Image tokens bill at the input rate               | Budget accordingly — a 64×64 PNG costs 64 image tokens per the vendor's own example                         |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
