---
title: Chutes Provider Guide
description: Chutes on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `moonshotai/Kimi-K2.6-TEE`
keywords: chutes, chutes.ai, openai-compatible, tier 2, provider setup, TEE, confidential compute
---

# Chutes Provider Guide

Chutes is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/chutes.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

> **Verification status: docs- and roster-verified, not yet live-verified.**
> This entry was onboarded credential-free — every fact below comes from an
> unauthenticated `GET /v1/models` call and Chutes' own public docs/pricing
> pages, never from a request made with an API key. No `POST` request of any
> kind was sent to Chutes. That means capability flags (tools, structured
> output, vision), error-message shapes and the billing policy are the
> vendor's own documentation, not a NeuroLink live probe — see
> [Verification status](#verification-status) below, and re-run the
> live-verification steps in
> [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry)
> with a real key before relying on this provider for anything that needs
> proven behavior (e.g. `structuredOutputWithTools`, which is left `false`
> here specifically because no combined tools+schema probe was possible).

---

## Key Facts

- **Provider id**: `chutes`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — confirmed via
  Chutes' own homepage Python code sample, which posts to
  `https://llm.chutes.ai/v1/chat/completions` with `model`, `messages`, an
  `Authorization: Bearer $CHUTES_API_KEY` header, and `stream: true`.
- **Base URL**: `https://llm.chutes.ai/v1`
- **Default model**: `moonshotai/Kimi-K2.6-TEE`
- **Models in catalog**: 14 — all TEE (confidential-compute) entries from the
  public roster at the time of writing
- **Streaming**: documented (Guides → Streaming, Examples → Streaming
  Responses; the homepage sample itself streams)
- **Tool calling**: documented, model-dependent — most catalog entries list
  `tools` in their `supported_features`, but two roster ids
  (`unsloth/Mistral-Nemo-Instruct-2407-TEE`,
  `Nemotron-3-Nano-Omni-30B-TEE`) report no feature list at all, so
  `capabilities.tools` is `"model-dependent"` rather than a flat `true`
- **Structured output**: documented — `response_format: {"type":
"json_object"}` is shown in Chutes' function-calling guide as a JSON-mode
  alternative to tool calls; most catalog entries also list `json_mode` /
  `structured_outputs` in `supported_features`
- **Structured output + tools together**: not documented as combined and not
  probed (no key was used) — `structuredOutputWithTools` is `false`
- **Embeddings**: not confirmed on the standard `/v1/embeddings` path in the
  public docs (there's an "Embeddings" example and a TEI template, but no
  documented general-purpose endpoint) — left `false`
- **Vision**: model-dependent — 6 of 14 roster ids declare `image` (two also
  `video`) in `input_modalities`; see the [Models](#models) table
- **Billing**: `no-free-tier` (recorded conservatively — see
  [Billing](#billing) below)
- **Key format**: keys are issued with a `cpk_` prefix (`Authorization:
Bearer cpk_...`); `X-API-Key` is documented as _not_ a supported auth scheme

---

## Quick Start

### 1. Get an API key

1. Visit: https://chutes.ai/signup and create an account (pick a username;
   sign up with Google, GitHub, or optionally link a Bittensor wallet — no
   card is asked for on this page)
2. Manage billing and create API keys at https://api.chutes.ai
   (account/billing/API-key management is a separate host from the
   inference API)
3. Review current token pricing at https://chutes.ai/pricing before making
   requests — pay-as-you-go per token (USD per 1M tokens) plus optional paid
   Plus/Pro plans; no free trial credits are documented, so budget for a
   funded account from the first call
4. Set `CHUTES_API_KEY` in your .env file — keys are issued with a `cpk_`
   prefix and must be sent as `Authorization: Bearer CHUTES_API_KEY`

### 2. Configure

```bash
export CHUTES_API_KEY=cpk_your-api-key
export CHUTES_MODEL=moonshotai/Kimi-K2.6-TEE   # optional — overrides the default model
export CHUTES_BASE_URL=https://llm.chutes.ai/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "chutes",
  model: "moonshotai/Kimi-K2.6-TEE",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider chutes
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "chutes",
  credentials: { chutes: { apiKey: process.env.CHUTES_API_KEY } },
});
```

---

## Models

All context/output figures and pricing below are read directly from the
vendor's own unauthenticated `GET https://llm.chutes.ai/v1/models` response
(re-run 2026-09-28, HTTP 200, 14 models) — never invented. Where a field was
absent from that response (two entries below), it is left blank rather than
guessed.

| Model                                    | Context   | Max output | Vision             | $/M in · out (cached in)    | Notes                                                                                                                                                                                                           |
| ---------------------------------------- | --------- | ---------- | ------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moonshotai/Kimi-K2.6-TEE` ⭐            | 262,144   | 65,535     | yes (image, video) | $0.50 / $2.85 ($0.05)       | Default — the model in Chutes' own homepage `chat/completions` code sample. `json_mode`, `structured_outputs`, `tools`, `reasoning` documented.                                                                 |
| `moonshotai/Kimi-K3-TEE`                 | 1,048,576 | 65,535     | yes (image, video) | $3.00 / $15.00 ($0.30)      | Largest context window in the roster; same documented feature set as the default; fallback.                                                                                                                     |
| `deepseek-ai/DeepSeek-V4-Flash-0731-TEE` | 1,048,576 | 131,072    | no                 | $0.44 / $1.32 ($0.044)      | Largest documented max output in the roster; text-only; fallback.                                                                                                                                               |
| `zai-org/GLM-5.2-TEE`                    | 1,048,576 | 65,535     | no                 | $1.25 / $3.95 ($0.125)      | Text-only; fallback.                                                                                                                                                                                            |
| `Qwen/Qwen3.5-397B-A17B-TEE`             | 262,144   | 65,536     | yes (image)        | $0.45 / $3.00 ($0.045)      | MoE model; fallback.                                                                                                                                                                                            |
| `Qwen/Qwen3.6-27B-TEE`                   | 262,144   | 65,536     | yes (image)        | $0.30 / $2.00 ($0.03)       | Fallback.                                                                                                                                                                                                       |
| `Qwen/Qwen3.8-27B-TEE`                   | 262,144   | 65,536     | yes (image)        | $0.24 / $2.20 ($0.024)      | Fallback.                                                                                                                                                                                                       |
| `Qwen/Qwen3-235B-A22B-Thinking-2507-TEE` | 262,144   | 262,144    | no                 | $0.2989 / $1.1957 ($0.0299) | Reasoning-focused variant; max output equals the full context window, so give it a generous token budget.                                                                                                       |
| `deepseek-ai/DeepSeek-V3.2-TEE`          | 131,072   | 65,536     | no                 | $1.00 / $1.00 ($0.10)       | Fallback.                                                                                                                                                                                                       |
| `zai-org/GLM-5.1-TEE`                    | 202,752   | 65,535     | no                 | $0.98 / $3.08 ($0.098)      | Prior GLM generation; fallback.                                                                                                                                                                                 |
| `google/gemma-4-31B-turbo-TEE`           | 131,072   | 65,536     | yes (image)        | $0.12 / $0.37 ($0.012)      | Roster reports a larger 262,144 `max_model_len`; `context_length` (131,072) is used as the documented context window.                                                                                           |
| `Qwen/Qwen3-32B-TEE`                     | 40,960    | 40,960     | no                 | $0.104 / $0.416 ($0.0104)   | Smallest context window in the roster; fallback.                                                                                                                                                                |
| `unsloth/Mistral-Nemo-Instruct-2407-TEE` | —         | —          | no                 | $0.0245 / $0.0978 ($0.0024) | Cheapest model in the roster; only `max_model_len` (131,072) is documented — context/output/vision/feature fields are absent, so they're left blank here rather than guessed.                                   |
| `Nemotron-3-Nano-Omni-30B-TEE`           | —         | —          | no                 | $0.0245 / $0.0978 ($0.0024) | Same undocumented-field pattern as Mistral Nemo above. The "Omni" name suggests multimodal support, but nothing in the public roster confirms it, so vision is left `false` rather than inferred from the name. |

Context window shown is the catalog default of 262,144 tokens (the default
model's own context window); the default max output is 65,535 tokens
(`moonshotai/Kimi-K2.6-TEE`'s documented `max_output_length`).

**Fallback order** when the default is unavailable: `moonshotai/Kimi-K3-TEE`
→ `deepseek-ai/DeepSeek-V4-Flash-0731-TEE` → `zai-org/GLM-5.2-TEE` →
`Qwen/Qwen3.5-397B-A17B-TEE` → `Qwen/Qwen3.6-27B-TEE` →
`Qwen/Qwen3.8-27B-TEE` → `Qwen/Qwen3-235B-A22B-Thinking-2507-TEE` →
`deepseek-ai/DeepSeek-V3.2-TEE` → `zai-org/GLM-5.1-TEE` →
`google/gemma-4-31B-turbo-TEE` → `Qwen/Qwen3-32B-TEE` →
`unsloth/Mistral-Nemo-Instruct-2407-TEE` → `Nemotron-3-Nano-Omni-30B-TEE`.

---

## Billing

Chutes' [pricing page](https://chutes.ai/pricing) shows pay-as-you-go token
pricing ("No subscription, no minimum, no markup") plus two optional paid
plans (Plus at $10/mo, Pro at $20/mo, each bundling a daily quota and a
discount off PAYG rates), an Enterprise tier, and a per-second-billed
"Private Chutes" dedicated-GPU option. A Bittensor-wallet TAO payment option
is also offered alongside standard payment. The page's own FAQ asks **"Is
there a free trial?"**, but that answer was collapsed in every fetch of the
page during this onboarding and could not be confirmed either way — nor does
any other public page state that new accounts receive free credits. Signup
itself (https://chutes.ai/signup) does not ask for a card, but that is not
the same as confirming free usage. Given the absence of documented free
credits, `billingPolicy` is recorded conservatively as `no-free-tier`. Treat
this as unconfirmed rather than a claim that no free tier exists — verify
directly in the Chutes console before onboarding a team on the assumption of
either outcome.

---

## Verification status

Tier-2 onboarding normally requires a live-key capability sweep
(`docs/provider-integration/tiers/tier-2-catalog-entry.md`,
"Live verification"), gated by `pnpm run verify:provider-onboarding`. This
entry was added under a **credential-free** onboarding pass instead: no
Chutes API key was ever created or used, and no authenticated or `POST`
request was sent to any Chutes endpoint. Everything below is either a public
document or a single unauthenticated `GET`.

| Probe                     | Result                                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roster                    | Unauthenticated `GET https://llm.chutes.ai/v1/models`, HTTP 200, 14 models, re-run 2026-09-28. `/v1/models` is itself documented by Chutes as a "public catalog (no key required)."                                                                                                        |
| Wire shape                | Chutes' own homepage Python sample posts to `https://llm.chutes.ai/v1/chat/completions` with `model` + `messages` + `Authorization: Bearer $CHUTES_API_KEY` + `stream: true` — never executed here, only read.                                                                             |
| Tools / structured output | Confirmed from docs only: the "Function Calling, Agents, and Tool Use" guide shows OpenAI-shaped `tools`/`tool_choice`/`tool_call_id`, and the same guide shows a separate `response_format: {"type": "json_object"}` JSON-mode example. No request combining both was found or attempted. |
| Auth failure shape        | Not probed (would require a `POST`, which credential-free onboarding forbids) and not given verbatim in the docs, so `errorRules` is empty — NeuroLink's default error classifier handles this provider until a live probe supplies a documented shape.                                    |
| Live capability matrix    | **Not run.** `evidence.liveMatrix` is `null`. Run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=chutes` with a real `CHUTES_API_KEY` before depending on this provider for tool calling, structured output, or vision in production.                                   |

---

## Troubleshooting

| Symptom                                                    | Cause                                                                                            | Fix                                                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requests hit an anonymous rate limit (HTTP 429)            | No token, or an invalid token, was sent                                                          | Set `CHUTES_API_KEY`, and send it as `Authorization: Bearer <key>` — `X-API-Key` is documented as unsupported for inference calls                           |
| Model not found                                            | The roster changed since 2026-09-28                                                              | Pick a current id from the unauthenticated `GET /v1/models` roster                                                                                          |
| Structured output silently dropped when tools are used     | `structuredOutputWithTools` is `false` — no combined probe was possible                          | This is intentional pending a live-key check, not a bug; NeuroLink's runtime conflict retry drops structured output and retries rather than losing the turn |
| Unsure whether a specific model supports tools / JSON mode | `capabilities.tools` is `"model-dependent"` — two roster ids ship no `supported_features` at all | Check the model's entry in `GET /v1/models`, or consult the [Models](#models) table above                                                                   |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration, and what live verification still needs to happen
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
