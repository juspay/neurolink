---
title: Charm Hyper Provider Guide
description: Charm Hyper on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek-v4-pro`. Docs- and roster-verified only; not yet live-verified.
keywords: charm hyper, hyper, charm, openai-compatible, tier 2, provider setup, deepseek, kimi, glm, qwen, minimax
---

# Charm Hyper Provider Guide

Charm Hyper is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/charm-hyper.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status: docs- and roster-verified, not live-verified.** This
> entry was onboarded credential-free — everything below comes from Hyper's
> own public documentation and an unauthenticated `GET /v1/models` call. No
> API key was ever created, and no authenticated or `POST` request was made
> to Hyper — so no chat call, tool call, structured-output call, or error
> response was ever actually exercised. Capabilities below reflect what the
> docs state or omit, not what a live probe proved. Run the
> [Tier-2 live verification steps](/docs/provider-integration/tiers/tier-2-catalog-entry)
> (roster probe with a real key, billing check, capability probes, live
> matrix) before relying on this entry in production, and fill in
> `evidence.liveMatrix` when that happens.

---

## Key Facts

- **Provider id**: `charm-hyper`
- **Protocol**: OpenAI-compatible (`/v1/chat/completions`). Hyper also
  documents an Anthropic-compatible `/v1/messages` endpoint, which this entry
  does not use.
- **Base URL**: `https://hyper.charm.land/v1`
- **Default model**: `deepseek-v4-pro` — this is **not** a vendor-declared
  default; Hyper's docs never label any model "default" or "recommended". It
  is the `model` value used in the worked example on Hyper's own Chat
  Completions reference page. Hyper's homepage quick-start uses a different
  example model (`deepseek-v4-flash`) — reconfirm the right default once a
  key is available.
- **Models in catalog**: 23 (the full public roster as of 2026-09-28)
- **Streaming**: documented (`stream: true`, SSE, terminal `[DONE]`)
- **Tool calling**: documented — `tools` is a listed request parameter
  ("Tool/function definitions"), but no worked tool-call example exists in
  the docs and it was never probed live, so `toolsWithStreaming` is left
  `false` pending verification.
- **Structured output**: **not documented at all** — the terms
  `response_format`, "JSON mode" and "structured output" never appear
  anywhere in Hyper's API docs. `structuredOutput` and
  `structuredOutputWithTools` are both `false` in the catalog.
- **Embeddings**: not documented / not supported
- **Billing**: free-tier — $0/month, 100 Hypercredits/month (1 Hypercredit ≈
  $0.05); paid subscription and prepaid bundles also exist
- **Key format**: keys start with `sk-hyper-`

---

## Quick Start

### 1. Get an API key

1. Visit: https://hyper.charm.land/auth?mode=signup and sign up (Google,
   GitHub, or email)
2. Copy an API key from the Hyper Dashboard — it starts with `sk-hyper-`
3. Free plan: $0/month, 100 Hypercredits/month; paid subscription
   ($20/month, 250 Hypercredits/day) and prepaid bundles (never expire) are
   also available
4. Set `CHARM_HYPER_API_KEY` in your .env file

### 2. Configure

```bash
export CHARM_HYPER_API_KEY=sk-hyper-your-api-key
export CHARM_HYPER_MODEL=deepseek-v4-pro          # optional — overrides the default model
export CHARM_HYPER_BASE_URL=https://hyper.charm.land/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "charm-hyper",
  model: "deepseek-v4-pro",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider charm-hyper
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "charm-hyper",
  credentials: { "charm-hyper": { apiKey: process.env.CHARM_HYPER_API_KEY } },
});
```

---

## Models

All 23 entries come from the public, unauthenticated `GET
https://hyper.charm.land/v1/models` response (2026-09-28) — context window,
max output tokens, vision and pricing are the vendor's own served metadata,
not estimates.

| Model                    | Context   | Max out | Vision | $/M in · out (cached in)          | Notes                                                                                                                                                                                               |
| ------------------------ | --------- | ------- | ------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deepseek-v4-pro` ⭐     | 1M        | 384K    | no     | $2.40 / $4.80 ($0.20)             | Default for this entry — Hyper's own Chat Completions reference example.                                                                                                                            |
| `deepseek-v4.1-flash`    | 1,048,576 | 32,768  | yes    | $0.30 / $1.20 ($0.03)             | Newest DeepSeek Flash snapshot; reasoning effort low/high/xhigh.                                                                                                                                    |
| `deepseek-v4-flash`      | 1M        | 384K    | no     | $0.20 / $0.40 ($0.04)             | Homepage quick-start's example model. Hyper's marketing page lists this id under "attachment support", but the live roster reports `vision: false` — a documented inconsistency, not resolved here. |
| `deepseek-v4-pro-0813`   | 1M        | 262,144 | no     | $1.437216 / $4.311648 ($0.047907) | Dated pin of the Pro line.                                                                                                                                                                          |
| `deepseek-v4-flash-0731` | 1M        | 384K    | no     | $0.44 / $1.32 ($0.044)            | Dated pin of the Flash line.                                                                                                                                                                        |
| `kimi-k3`                | 1,048,576 | 16,000  | yes    | $3.2664 / $16.332 ($0.32664)      | Moonshot Kimi K3.                                                                                                                                                                                   |
| `kimi-k2-thinking`       | 262,144   | 26,214  | no     | $0.60 / $2.50 ($0.30)             | Reasoning-first Kimi variant.                                                                                                                                                                       |
| `kimi-k2.7-code`         | 256,000   | 16,000  | yes    | $1.03436 / $4.3552 ($0.206872)    | Code-focused Kimi variant.                                                                                                                                                                          |
| `glm-5.3`                | 1M        | 128,000 | no     | $1.52432 / $4.79072 ($0.283088)   | Zhipu GLM 5.3.                                                                                                                                                                                      |
| `glm-5.3-flash`          | 1,048,576 | 131,072 | yes    | $0.16332 / $0.5444 ($0.031575)    | Zhipu GLM 5.3 Flash.                                                                                                                                                                                |
| `glm-5.2`                | 1M        | 32,768  | no     | $1.52432 / $4.79072 ($0.152432)   | Prior GLM generation.                                                                                                                                                                               |
| `minimax-m3`             | 512,000   | 512,000 | yes    | $0.32664 / $1.30656 ($0.064239)   | MiniMax M3 — max output equals its context window.                                                                                                                                                  |
| `minimax-m2.7`           | 262,100   | 6,553   | no     | $0.484 / $1.852 ($0.242)          | Prior MiniMax generation.                                                                                                                                                                           |
| `inkling`                | 1,048,576 | 65,536  | yes    | $1.0888 / $4.40964 ($0.185096)    | Lineage not stated in the docs read for this entry.                                                                                                                                                 |
| `qwen3.8-max`            | 1M        | 65,536  | yes    | $2.00 / $6.00 ($0.25)             | Alibaba Qwen3.8 Max.                                                                                                                                                                                |
| `qwen3.8-flash`          | 1M        | 128,000 | yes    | $0.15 / $0.47 ($0.016)            | Alibaba Qwen3.8 Flash.                                                                                                                                                                              |
| `qwen3.8-27b`            | 1M        | 128,000 | yes    | $0.50 / $3.00 ($0.10)             | Alibaba Qwen3.8 27B.                                                                                                                                                                                |
| `qwen3.8-2.4t-a95b`      | 1M        | 128,000 | no     | $2.00 / $6.00 ($0.25)             | Large Qwen3.8 MoE variant.                                                                                                                                                                          |
| `qwen3.7-max`            | 1M        | 64,000  | no     | $2.50 / $7.50 ($0.50)             | Prior Qwen generation.                                                                                                                                                                              |
| `qwen3.7-plus`           | 1M        | 64,000  | yes    | $1.20 / $4.80 ($0.24)             | Prior Qwen generation.                                                                                                                                                                              |
| `qwen3.7-flash`          | 1M        | 64,000  | yes    | $0.20 / $0.80 ($0.04)             | Prior Qwen generation.                                                                                                                                                                              |
| `gpt-oss-120b`           | 131,072   | 13,107  | no     | $0.178 / $0.68 ($0.089)           | OpenAI's open-weight gpt-oss-120b.                                                                                                                                                                  |
| `gemma-4-26b-a4b-it`     | 256,000   | 25,600  | no     | $0.098 / $0.334 ($0.049)          | Google Gemma 4 26B A4B, instruction-tuned.                                                                                                                                                          |

**Fallback order** when the default is unavailable: `deepseek-v4-flash` →
`deepseek-v4.1-flash` → `kimi-k2-thinking` → `glm-5.3` → `qwen3.8-max`.

No model is marked as a designated vision model (`models.visionModel`) —
Hyper's own pages disagree with each other about which models support image
input (see `deepseek-v4-flash` above), and the disagreement was left
unresolved rather than guessed at.

---

## Verification status

Tier-2 onboarding normally requires a live capability sweep, gated by `pnpm
run verify:provider-onboarding`. This entry was deliberately onboarded
**without** a key, so that step has not run yet:

| Probe                   | Result                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                  | **Unauthenticated** `GET /v1/models`, HTTP 200, 2026-09-28 — 23 models, matches Hyper's own docs statement that this endpoint needs no auth ("Browse the catalog — no auth required"). |
| Auth rejection          | Not probed — would require a real or deliberately-invalid API key, i.e. a credential, which this onboarding pass never created.                                                        |
| Tool calling            | Documented as an accepted parameter (`tools`, "Tool/function definitions") on the Chat Completions reference page; no worked example, no live call.                                    |
| Structured output       | **Not documented anywhere** in Hyper's API docs — `response_format` never appears.                                                                                                     |
| Streaming + tools combo | Not documented and not probed — `toolsWithStreaming` is `false` pending verification.                                                                                                  |
| Live capability sweep   | Not run. `evidence.liveMatrix` is `null`.                                                                                                                                              |

Two documented inconsistencies were found and are flagged rather than
silently resolved:

- The 401 error body shown on Hyper's Authentication page
  (`type: "invalid_request_error"`) disagrees with the error-type table on
  the Chat Completions page, which maps HTTP 401 to `authentication_error`.
  The catalog's `errorRules` entry matches on the message text
  (`"invalid api key"`, case-insensitive) rather than on either `type`
  value, so it doesn't depend on resolving the disagreement.
- Hyper's marketing models page (`docs/models.html`) lists "DeepSeek V4 Flash
  and GLM 5.1" as supporting attachments, but the live `/v1/models` roster
  reports `deepseek-v4-flash` as `vision: false` and has no `glm-5.1` model
  at all. The catalog trusts the live roster's `capabilities.vision` field
  over the marketing copy.

---

## Troubleshooting

| Symptom                                | Cause                                                                        | Fix                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Invalid Charm Hyper API key`          | `CHARM_HYPER_API_KEY` unset, wrong, or missing the `sk-hyper-` prefix        | Check the key in the Hyper Dashboard at https://hyper.charm.land                                |
| Model not found                        | The roster changed since 2026-09-28                                          | Pick a current id from the unauthenticated `GET /v1/models` roster                              |
| Structured output silently unavailable | `structuredOutput` is `false` — Hyper's docs never mention `response_format` | Use `generate()` without `schema`, or verify support live before relying on it                  |
| Unsure if tool calls stream correctly  | `toolsWithStreaming` is `false` — never documented or probed                 | Test with `stream: false` first, or run the live matrix before depending on streamed tool calls |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration, and what live verification still needs to happen
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
