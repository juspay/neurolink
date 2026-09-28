---
title: Inco Provider Guide
description: Inco on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `glm-5.3`
keywords: inco, openai-compatible, tier 2, provider setup, glm, deepseek, kimi, minimax
---

# Inco Provider Guide

Inco is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/inco.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** Every field below was built from Inco's own published
> documentation (`https://platform.inco.ai/docs`) and an unauthenticated
> `GET https://api.inco.ai/v1/models` — no API key was used or obtained.
> Capabilities that can only be proven with a working key (tool calling,
> structured output, vision replies, the exact 401/404/429 error bodies) are
> left conservative (`false`) or undocumented until a live capability sweep
> runs. See [Live verification](#live-verification-still-needed) below.

---

## Key Facts

- **Provider id**: `inco`
- **Protocol**: OpenAI-compatible (`POST /v1/chat/completions`); the vendor's
  docs also describe an Anthropic-SDK-shaped path at the host root
  (`https://api.inco.ai`), not used by this entry
- **Base URL**: `https://api.inco.ai/v1`
- **Default model**: `glm-5.3` (editorial pick — Inco's docs name no
  recommended/default model; chosen for its documented `reasoning_effort`
  support and mid-range price among the roster)
- **Models in catalog**: 10
- **Streaming**: supported (SSE, per vendor docs)
- **Tool calling**: not documented by the vendor — left `false` until proven
- **Structured output**: not documented by the vendor — left `false` until
  proven
- **Embeddings**: not documented
- **Billing**: no free tier — strictly prepaid, pay-per-token; a zero balance
  returns HTTP 402 (`credit_balance_exhausted`) until you top up
- **Key format**: `sk-inco-...`
- **Access**: currently **waitlist-gated** — sign-up is not self-serve

---

## Quick Start

### 1. Get an API key

1. Visit: https://platform.inco.ai/waitlist and request access — Inco is
   currently waitlist-gated, not open signup; existing users sign in at
   https://platform.inco.ai/sign-in
2. Once approved, create an API key on the dashboard's Keys page
   (https://platform.inco.ai/keys) — it is shown in full only once and
   starts with `sk-inco-`
3. Add prepaid credit before use: billing is strictly pay-per-token with no
   free tier, and a zero balance returns HTTP 402
   (`credit_balance_exhausted`) until you top up
4. Set `INCO_API_KEY` in your .env file

### 2. Configure

```bash
export INCO_API_KEY=your-api-key
export INCO_MODEL=glm-5.3                          # optional — overrides the default model
export INCO_BASE_URL=https://api.inco.ai/v1         # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "inco",
  model: "glm-5.3",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider inco
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "inco",
  credentials: { inco: { apiKey: process.env.INCO_API_KEY } },
});
```

---

## Models

| Model                      | Context | Vision | $/M in · out (cached)  | Notes                                                                                                                    |
| -------------------------- | ------- | ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `glm-5.3` ⭐               | 1M      | no     | $1.40 / $4.40 ($0.26)  | Default (editorial pick). Standard tier, 744B params, exposes `reasoning_effort`.                                        |
| `deepseek-v4.1-flash`      | 1M      | no     | $0.30 / $1.20 ($0.006) | Standard tier, 552B params, `reasoning_effort`. Fallback.                                                                |
| `kimi-k3`                  | 1M      | no     | $3.00 / $15.00 ($0.30) | Standard tier, 2.8T params (MoE), `reasoning_effort`. Fallback.                                                          |
| `glm-5.3-flash`            | 1M      | no     | $0.15 / $0.50 ($0.03)  | Standard tier, 320B params. Fallback.                                                                                    |
| `minimax-m3`               | 1M      | yes    | $0.30 / $1.20 ($0.06)  | Standard tier, 428B params, `reasoning_effort`. Vision per the catalog's `modalities` field — not live-probed. Fallback. |
| `glm-5.3:fast`             | 1M      | no     | $2.80 / $8.80 ($0.52)  | Fast-tier sibling of the default; ~2x price for lower latency. Fallback.                                                 |
| `kimi-k3:fast`             | 1M      | no     | $6.00 / $30.00 ($0.60) | Fast-tier sibling of `kimi-k3`. Fallback.                                                                                |
| `deepseek-v4.1-flash:fast` | 1M      | yes    | $0.60 / $2.40 ($0.012) | Fast-tier sibling; vision per `modalities` (the non-fast id has no `modalities` field) — not live-probed. Fallback.      |
| `glm-5.3-flash:fast`       | 1M      | yes    | $0.15 / $0.50 ($0.03)  | Fast-tier sibling; vision per `modalities` (the non-fast id has no `modalities` field) — not live-probed. Fallback.      |
| `minimax-m3:fast`          | 1M      | yes    | $0.60 / $2.40 ($0.12)  | Fast-tier sibling of `minimax-m3`, same vision claim. Fallback.                                                          |

Context window shown is the documented `context_length` of 1,048,576 tokens
for every model (from the live, unauthenticated `GET /v1/models` response,
2026-09-28). Inco's catalog does not publish a separate per-request output
token ceiling, so `defaultMaxOutputTokens` uses a conservative generic
default (4,096) rather than an invented vendor number.

Vision is read directly from the live catalog's own `modalities` field
(`input: ["text","image"]`), which four of the ten ids carry and six do not —
this is vendor-reported metadata, not a probed capability; no image request
has actually been sent to Inco.

**Fallback order** when the default is unavailable: `deepseek-v4.1-flash` →
`kimi-k3` → `glm-5.3-flash` → `minimax-m3` → `glm-5.3:fast` → `kimi-k3:fast` →
`deepseek-v4.1-flash:fast` → `glm-5.3-flash:fast` → `minimax-m3:fast`.

---

## Live verification still needed

Tier-2 onboarding normally requires an authenticated roster probe, an auth
rejection probe, and a live capability sweep
(`docs/provider-integration/tiers/tier-2-catalog-entry.md`). This entry was
built **credential-free** — no signup, no key, no POST request to Inco — so
none of that could run yet:

| Probe                  | Result                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                 | **Done.** Unauthenticated `GET /v1/models`, HTTP 200, 2026-09-28, 10 models — matches the vendor docs' claim that the catalog "can be fetched without a key."                                                                                                                                                                                                                                                       |
| Docs cross-check       | **Done.** `https://platform.inco.ai/docs` confirms the OpenAI Chat Completions wire shape, `Authorization: Bearer sk-inco-...` auth, and the documented error `code` values (`invalid_api_key`, `key_expired`, `model_not_found`, `rate_limit_exceeded`, `spend_limit_exceeded`, `credit_balance_exhausted`) used to build `errorRules` — no literal JSON error bodies were shown on the page, only the code table. |
| Auth rejection (live)  | **Not run.** Would require a `POST /v1/chat/completions` with a missing/bad key — out of scope for a credential-free pass.                                                                                                                                                                                                                                                                                          |
| Billing (live)         | **Not run.** Billing policy (`no-free-tier`, prepaid, HTTP 402 on empty balance) is taken from the docs' own wording, not a live probe.                                                                                                                                                                                                                                                                             |
| Tool calling           | **Not documented, not probed.** `capabilities.tools` is `false` until the vendor's docs or a live probe show function calling.                                                                                                                                                                                                                                                                                      |
| Structured output      | **Not documented, not probed.** `capabilities.structuredOutput` and `structuredOutputWithTools` are `false` — no combined (or even single) probe was possible without a key.                                                                                                                                                                                                                                        |
| Vision                 | **Vendor-reported metadata only.** Four ids carry a `modalities` field naming image input; no image request has been sent.                                                                                                                                                                                                                                                                                          |
| Live capability matrix | **Not run.** `evidence.liveMatrix` is `null`. Once a key is obtained (waitlist approval), run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=inco` and record the result there.                                                                                                                                                                                                                  |

Anyone picking this up with a working key should re-run the roster probe
(rosters drift), then follow the four-step live-verification checklist in
`tiers/tier-2-catalog-entry.md` before flipping any capability flag from
`false` to `true`.

---

## Troubleshooting

| Symptom                          | Cause                                                                | Fix                                                                                            |
| -------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Invalid Inco API key`           | `INCO_API_KEY` unset, wrong, or expired                              | Check the key on the dashboard's Keys page (https://platform.inco.ai/keys)                     |
| Model not found                  | The roster changed since 2026-09-28, or the id is mistyped           | Pick a current id from the unauthenticated `GET /v1/models` roster                             |
| HTTP 402 on every request        | Prepaid balance is empty (`credit_balance_exhausted`) — no free tier | Top up credit on the dashboard before retrying                                                 |
| HTTP 429, `spend_limit_exceeded` | Your account's monthly spending cap was hit                          | Raise the cap on the Limits page, or wait for the next billing cycle                           |
| HTTP 429, `rate_limit_exceeded`  | Per-minute request limit hit                                         | Back off and retry; check the `x-inco-ratelimit-scope` response header (`quota` vs `upstream`) |
| Can't sign up                    | Access is currently gated by a waitlist, not open signup             | Join the waitlist at https://platform.inco.ai/waitlist                                         |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
