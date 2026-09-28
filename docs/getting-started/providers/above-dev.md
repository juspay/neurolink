---
title: above.dev Provider Guide
description: above.dev on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `deepseek-v4.1-flash`
keywords: above.dev, openai-compatible, tier 2, provider setup, deepseek, glm, qwen, mimo, gateway
---

# above.dev Provider Guide

above.dev is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/above-dev.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status: docs- and roster-verified, not yet live-verified.**
> Everything below comes from above.dev's own public docs
> (https://above.dev/docs) and an unauthenticated `GET /v1/models` call — no
> API key was used or obtained. No `generate()`/`stream()` request has been
> made against this provider yet, so chat, streaming, tool calling and
> structured output are **not** confirmed to work end-to-end. See
> [Verification status](#verification-status) below before relying on this
> provider in production.

---

## Key Facts

- **Provider id**: `above-dev`
- **Protocol**: OpenAI-compatible (`POST /v1/chat/completions`, documented as
  an alias that delegates to the vendor's native `POST /v1/messages` with
  "identical behaviour")
- **Base URL**: `https://api.above.dev/v1`
- **Default model**: `deepseek-v4.1-flash` (above.dev's own default when no
  model is named — "the cheapest model in the catalog")
- **Models in catalog**: 9
- **Streaming**: documented (`stream: true`, SSE, dedicated docs section)
- **Tool calling**: documented as an accepted request field, but only as a
  **routing signal** — see [Tools & structured output](#tools-and-structured-output)
- **Structured output**: same caveat as tool calling; not declared supported
  here
- **Embeddings**: not documented
- **Billing**: no free tier — API keys are issued only after purchase
- **Key format**: prefix `sk-gw-` documented; the full character set after
  the prefix is not specified
- **Rate limits**: 300 requests/minute per account (account-wide, all keys)

---

## Quick Start

### 1. Get an API key

1. Visit: https://above.dev/pricing and purchase credit — API keys are issued only after purchase, there is no free signup
2. Copy the issued key — it starts with `sk-gw-` (the docs give only the prefix, not a full character-set spec)
3. Manage or rotate the key from https://above.dev/dashboard if it is ever compromised — a key grants full access to your credit balance
4. Set `ABOVE_DEV_API_KEY` in your .env file

### 2. Configure

```bash
export ABOVE_DEV_API_KEY=your-api-key
export ABOVE_DEV_MODEL=deepseek-v4.1-flash     # optional — overrides the default model
export ABOVE_DEV_BASE_URL=https://api.above.dev/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "above-dev",
  model: "deepseek-v4.1-flash",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider above-dev
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "above-dev",
  credentials: { "above-dev": { apiKey: process.env.ABOVE_DEV_API_KEY } },
});
```

---

## Models

| Model                      | Context | Vision | $/M in · out           | Notes                                                                           |
| -------------------------- | ------- | ------ | ---------------------- | ------------------------------------------------------------------------------- |
| `deepseek-v4.1-flash` ⭐   | 1M      | yes\*  | time-of-day (see note) | Default — the id above.dev itself routes to when no model is named. Tier T1.    |
| `deepseek-v4-pro`          | 1M      | no     | time-of-day (see note) | Tier T2 ("agentic — multi-step, tool-capable" per the vendor's own tier table). |
| `glm-5.2`                  | 1.05M   | no     | $1.54 / $4.84          | Zhipu GLM 5.2. Tier T2.                                                         |
| `glm-5.3-flash`            | 1.05M   | yes\*  | $0.165 / $0.55         | Zhipu GLM 5.3 Flash. Tier T1.                                                   |
| `glm-5.2-fast`             | 1.05M   | no     | $2.31 / $7.26          | Zhipu GLM 5.2 Fast. Tier T3 ("highest capability in the catalog").              |
| `qwen3.8-max`              | 1M      | yes\*  | $2.20 / $6.60          | Alibaba Qwen 3.8 Max. Tier T3.                                                  |
| `mimo-v2.6-pro`            | 1M      | no     | $0.5077 / $1.0154      | MiMo V2.6 Pro. Tier T2.                                                         |
| `mimo-v2.6-flash`          | 1M      | no     | $0.1692 / $0.3385      | MiMo V2.6 Flash. Tier T1.                                                       |
| `mimo-v2.6-pro-ultraspeed` | 1M      | no     | $5.0769 / $10.1538     | MiMo V2.6 Pro UltraSpeed. Tier T3.                                              |

\* Vision is `supports_vision: true` as **self-reported by above.dev's own
`GET /v1/models`** response (unauthenticated, retrieved 2026-09-28). No image
was actually sent to any model — this is vendor-stated metadata, not a
live-probed result, so `models.visionModel` is deliberately left unset in the
catalog entry.

Every model in the current catalog accepts up to **131,072 output tokens**
(documented account-wide limit, also reported per-model as
`max_completion_tokens` in `GET /v1/models`).

**Time-of-day pricing**: `deepseek-v4.1-flash` and `deepseek-v4-pro` bill at
different peak/off-peak rates (peak = 01:00–04:00 and 06:00–10:00 UTC on
weekdays; everything else, including all of the weekend in Beijing time, is
off-peak). Because the catalog schema's `pricingPerMTok` is a single number,
not a range, these two models' pricing is **omitted from the catalog entry
rather than collapsed into one number** — see above.dev's pricing table
(https://above.dev/docs) for the current peak/off-peak figures. Every other
model in this roster bills a single flat rate, shown above.

**Fallback order** when the default is unavailable: `glm-5.3-flash` →
`mimo-v2.6-flash` → `deepseek-v4-pro` → `glm-5.2` → `mimo-v2.6-pro` →
`glm-5.2-fast` → `qwen3.8-max` → `mimo-v2.6-pro-ultraspeed`.

Two additional model ids, `glm-5.3-flash-modal` and `deepseek-v4.1-flash-modal`,
are named in above.dev's docs as "free-tier routes" capped at 16,384 output
tokens (they share a fixed concurrency pool). Neither id appears in the
current `GET /v1/models` roster, so neither is represented in this catalog —
and in any case a purchased key is still required to reach them, so the
provider's overall `billingPolicy` remains `no-free-tier`.

---

## Tools & structured output — a documented caveat {#tools-and-structured-output}

above.dev's own API reference table describes the `/v1/messages` request
parameters differently depending on the field:

- `temperature` — "Passed through to the model."
- `tool_choice` — "Tool choice control. Passed through to the model."
- `tools` — "Tool definitions. **Presence influences routing** toward
  tool-capable models."
- `response_format` — "Structured output format. **Presence scores toward**
  structured-output models."

The docs never state that `tools` or `response_format` are forwarded to, or
honoured by, whichever model ends up serving the request — only that sending
them nudges above.dev's routing. No example response containing `tool_calls`,
a `finish_reason` value, or a `reasoning`/`reasoning_content` field appears
anywhere in the docs. `GET /v1/models` does self-report
`supports_tool_calls: true` and `supports_structured_output: true` for every
model in the roster, but that is unauthenticated, vendor-supplied metadata,
not a probed result.

Given that ambiguity and that no live request (which would require a paid
key) was made:

- `capabilities.tools` is set to **`"model-dependent"`** rather than `true`.
- `capabilities.structuredOutput` and `capabilities.structuredOutputWithTools`
  are both **`false`**.
- `capabilities.thinking` is **`false`** — `GET /v1/models` reports
  `supports_reasoning: true` for every model, but the human-readable docs
  never document a `reasoning`/`thinking` request or response field, so this
  is not treated as a confirmed NeuroLink-facing capability.

A future pass with a real key should re-probe all of this the way
`friendli.json`/`novita.json` were probed (see `docs/provider-integration/tiers/tier-2-catalog-entry.md#live-verification`)
and tighten these flags with `evidence.liveMatrix` filled in.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for above.dev — **docs- and roster-verified only,
not yet live-verified**:

| Probe                 | Result                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated `GET https://api.above.dev/v1/models` — HTTP 200, 9 models, 2026-09-28. No key used.                                  |
| Docs cross-check      | `https://above.dev/docs` fetched and re-read 2026-09-28 for auth header shape, endpoints, pricing, limits and error codes.            |
| Auth rejection probe  | **Not performed** — would require sending a request with a credential header, which is out of scope for a credential-free onboarding. |
| Live capability sweep | **Not performed** — `evidence.liveMatrix` is `null`. No `generate()`/`stream()` call has been made against `above-dev` yet.           |

Until a live matrix run fills in `evidence.liveMatrix`, treat `tools`,
`structuredOutput`, `structuredOutputWithTools` and `thinking` as unproven —
the catalog entry already reflects that by declining to assert them.

---

## Troubleshooting

| Symptom                                | Cause                                                         | Fix                                                                                         |
| -------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Invalid or missing above.dev API key` | `ABOVE_DEV_API_KEY` unset, wrong, or inactive (401)           | Check the key and get/rotate one at https://above.dev/pricing / https://above.dev/dashboard |
| Account balance insufficient (402)     | No purchased credit remaining                                 | Top up at https://above.dev/pricing                                                         |
| Model not enabled for key (403)        | The model is plan-restricted or in private beta for this key  | Pick another catalog model, or contact above.dev to enable it                               |
| Rate limited (429)                     | More than 300 requests/minute on the account                  | Retry after the documented `Retry-After` header                                             |
| Upstream timeout (504)                 | `provider_timeout` — the routed model did not respond in time | Retry the request                                                                           |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
