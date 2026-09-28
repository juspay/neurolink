---
title: Bee by HEOSSI Provider Guide
description: Bee by HEOSSI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `bee-cell`
keywords: bee, heossi, bee-heossi, openai-compatible, tier 2, provider setup
---

# Bee by HEOSSI Provider Guide

Bee by HEOSSI is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/bee-heossi.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, but not
> yet live-verified**. Every fact below comes from Bee's public docs
> (`https://bee.heossi.com/docs/sdks`, `/docs/changelog`, `/pricing`) and an
> unauthenticated `GET /bee/models` call, re-run on 2026-09-28 — no API key
> was created or used. No authenticated request (chat completion, tool call,
> structured-output probe, vision probe) has been made against this vendor.
> Capability flags that need a live account to confirm (tool calling,
> structured output, combined tools+schema, vision) are therefore
> conservative: unset or `false`/`"model-dependent"` rather than assumed.
> `evidence.liveMatrix` is `null` until someone runs the live capability
> sweep with a real key.

---

## Key Facts

- **Provider id**: `bee-heossi`
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.bee.heossi.com/bee` — note the base path is
  `/bee`, not `/v1`
- **Default model**: `bee-cell` (the model used in every SDK/curl example in
  Bee's own docs)
- **Models in catalog**: 13 (6 named tiers — Cell, Brood, Comb, Buzz, Hive,
  Swarm — plus their immutable pinned snapshot ids)
- **Streaming**: supported (documented `stream: true` request field)
- **Tool calling**: model-dependent — Bee's 2026-07-11 changelog states
  "Tool / function calling and JSON mode (structured output) are live on
  Comb, Buzz and Hive." Cell, Brood and Swarm are not named.
- **Structured output**: not asserted at the provider level (see above) —
  documented as live only on Comb/Buzz/Hive, not on the default model
  (`bee-cell`)
- **Thinking**: the public OpenAPI contract for `/bee/chat/completions`
  documents a `reasoning_effort` request field
  (`low | medium | high | xhigh | max | ultracode`)
- **Embeddings**: not supported — no embeddings endpoint in the public
  OpenAPI contract
- **Vision**: not documented for image input. The changelog documents
  **video** input as live on Comb/Buzz/Hive, which is a distinct modality
  from the image-vision capability this catalog tracks, so no model here is
  marked `vision: true`
- **Billing**: free-tier — Bee Cell / Bee Pollen is "Free hosted access — no
  card" (https://bee.heossi.com/pricing)
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://workspace.bee.heossi.com/account/api-keys and sign in (or create a Bee Workspace account)
2. Create an API key — the free Bee Cell / Bee Pollen tier needs no credit card ("Free hosted access — no card", https://bee.heossi.com/pricing)
3. Higher tiers (Brood/Comb/Buzz/Hive/Swarm) draw from a prepaid wallet billed per token; see https://bee.heossi.com/pricing for current rates
4. Set `BEE_HEOSSI_API_KEY` in your .env file

### 2. Configure

```bash
export BEE_HEOSSI_API_KEY=your-api-key
export BEE_HEOSSI_MODEL=bee-cell                              # optional — overrides the default model
export BEE_HEOSSI_BASE_URL=https://api.bee.heossi.com/bee     # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "bee-heossi",
  model: "bee-cell",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider bee-heossi
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "bee-heossi",
  credentials: { beeHeossi: { apiKey: process.env.BEE_HEOSSI_API_KEY } },
});
```

---

## Models

| Model         | Context | Vision | $/M in · out     | Notes                                                                                                                        |
| ------------- | ------- | ------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `bee-cell` ⭐ | 128K    | no     | $0.30 / $1.20    | Recommended — free tier, no card; used in every Bee SDK/curl example. Tool calling / JSON mode not documented for this tier. |
| `bee-brood`   | 256K    | no     | $0.60 / $2.40    | Second tier; not named among the tool-calling/JSON-mode tiers; fallback.                                                     |
| `bee-comb`    | 256K†   | no     | $1.25 / $5.00    | Tool calling + JSON-mode structured output documented live (2026-07-11 changelog); fallback.                                 |
| `bee-buzz`    | 256K†   | no     | $2.50 / $10.00   | Tool calling + JSON-mode structured output documented live; fallback.                                                        |
| `bee-hive`    | 256K‡   | no     | $5.00 / $20.00   | Tool calling + JSON-mode structured output documented live; fallback.                                                        |
| `bee-swarm`   | 1M      | no     | $25.00 / $150.00 | "1M natively" per the changelog; not named among the tool-calling/JSON-mode tiers; fallback.                                 |

† Comb and Buzz also expose a separately routed long-context mode serving up
to 1,010,000 tokens (2026-07-11 changelog) — a distinct routed path, not the
value shown here. ‡ Hive reaches a 1M-token mode "via Comb" per the pricing
page — routing detail, not modeled as this entry's context window.

Each named tier also has one or two immutable pinned snapshot ids on the live
roster (e.g. `bee-cell-20260710-r1`, `bee-comb-20260710-r1` and
`bee-comb-20260827-r1` — Comb's `current_snapshot`). These are in the catalog
for completeness but are not separately priced/documented and are not part of
`topModels` or the fallback chain.

Context window shown is the catalog default of 128,000 tokens (`bee-cell`);
no per-request max-output-token ceiling is documented for any tier, so the
catalog uses NeuroLink's house default of 4,096.

**Fallback order** when the default is unavailable: `bee-brood` →
`bee-comb` → `bee-buzz` → `bee-hive` → `bee-swarm`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Bee by HEOSSI today — **docs- and roster-verified only,
not live-verified**:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated GET `https://api.bee.heossi.com/bee/models`, HTTP 200, 13 models, 2026-09-28. The endpoint's own OpenAPI entry declares `security: []` (public).                                                                                                                                                                                                        |
| Docs cross-check      | Base URL, request/response shapes and `reasoning_effort` field confirmed against the public OpenAPI 3.1 contract at `https://api.bee.heossi.com/openapi.json` (retrieved 2026-09-28). Pricing/context per tier confirmed against `https://bee.heossi.com/pricing`. Tool-calling/JSON-mode/context-mode facts confirmed against `https://bee.heossi.com/docs/changelog`. |
| Auth rejection        | Not probed — no authenticated or POST request was made (credential-free onboarding). The OpenAPI contract documents a `401` response ("Missing or invalid API credential") with no literal error-body text, so `errorRules` uses status-only matching.                                                                                                                  |
| Live capability sweep | Not run. `evidence.liveMatrix` is `null`. Tool calling, JSON-mode structured output, combined tools+schema, and vision all need a real key to confirm and are conservatively unset/`false` until then.                                                                                                                                                                  |

---

## Troubleshooting

| Symptom                                            | Cause                                                                                        | Fix                                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Invalid Bee API key`                              | `BEE_HEOSSI_API_KEY` unset or wrong                                                          | Check the key at https://workspace.bee.heossi.com/account/api-keys                              |
| "insufficient funded usage credit" (HTTP 402)      | Prepaid wallet is empty (paid tiers only)                                                    | Top up at https://bee.heossi.com/pricing                                                        |
| "model or capability not included" (HTTP 403)      | The requested tier/feature isn't in your plan                                                | Upgrade at https://bee.heossi.com/pricing, or switch to a tier your plan includes               |
| Frequent 429s                                      | Allowance or rate limit reached                                                              | Wait and retry; review your plan's usage caps at https://bee.heossi.com/pricing                 |
| Tool calls / `response_format` ignored or rejected | `bee-cell` (the default) is not among the tiers Bee documents tool calling and JSON mode for | Switch to `bee-comb`, `bee-buzz` or `bee-hive`, which the 2026-07-11 changelog names explicitly |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
