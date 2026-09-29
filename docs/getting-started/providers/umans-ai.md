---
title: Umans AI Provider Guide
description: Umans AI on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `umans-coder`
keywords: umans, umans-ai, openai-compatible, tier 2, provider setup, glm, kimi, deepseek, qwen
---

# Umans AI Provider Guide

Umans AI is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/umans-ai.json`) rather than hand-written code.
That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** Every field below comes from Umans AI's own public pages and
> unauthenticated `GET` requests — no account was created and no API key was
> used to build it. `evidence.liveMatrix` is `null` until someone runs the live
> capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `umans-ai` (alias `umans`)
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the docs say "Umans
  Code also implements the OpenAI Chat Completions API"
  ([docs](https://app.umans.ai/offers/code/docs)). The same gateway also
  documents an Anthropic Messages route (`POST /v1/messages`) and a Responses
  route (`POST /v1/responses`); this entry uses only `/chat/completions`
- **Base URL**: `https://api.code.umans.ai/v1`
- **Default model**: `umans-coder` — a routing alias, not a fixed model, see
  [Models](#models)
- **Models in catalog**: 7 (curated from a 10-model live roster; three ids are
  left out on purpose — `umans-deepseek-v4.1-flash-lab` and
  `umans-mimo-v2.6-pro-lab`, which `/v1/models/info` describes as Labs
  experiments, "temporary, not a permanent id", with access "seat-gated through
  the Labs page", and `umans-qwen3.6-35b-a3b`, which it describes as a
  "Technical alias for `umans-flash`")
- **Streaming**: supported — the docs' OpenAI example sends `"stream": true` to
  `POST /v1/chat/completions`, and the reasoning section says reasoning "streams
  live, token by token, alongside the answer"
- **Tool calling**: `true` — `GET /v1/models/info` reports `supports_tools: true`
  for every roster model. The docs show no `tools` request example for
  `/v1/chat/completions`, so this rests on that field alone and has not been
  exercised
- **Tools while streaming**: not declared (`false`) — the docs show no
  tool-call request or response on this route, streaming or otherwise
- **Structured output**: not declared (`false`) — no page opened mentions
  `response_format`, `json_schema` or `json_object`
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared — the docs describe no embeddings route
- **Thinking**: `true` — the docs' "Reasoning & Extended Thinking" section
  documents `reasoning_effort` on `/v1/chat/completions` and returns reasoning
  in a `reasoning_content` field, separate from `content`. Which levels a model
  accepts varies, see [Models](#models)
- **Billing**: `no-free-tier` — a prepaid wallet billed per token, see
  [Billing](#billing) below
- **Key format**: the Umans pages conflict, so `apiKeyFormat` is `null` and
  NeuroLink does not validate a prefix. The docs' "Any BYOK Tool" section says
  the key "starts with `sk-`" and their examples write it as
  `sk-your-umans-api-key`, while the docs' wallet-summary example shows a key
  prefix of `umans_7fKq` and the homepage `.env` example shows `umans_`

---

## Quick Start

### 1. Get an API key

1. Visit: https://app.umans.ai/register and create an account with Google or an email and password (already have one? sign in at https://app.umans.ai/login). Organizations are provisioned by Umans: email contact@umans.ai (https://app.umans.ai/offers/code/docs/orgs)
2. Open https://app.umans.ai/billing, go to Dashboard -> API Keys and generate a key; the docs say it is shown only once, so copy it immediately
3. Prepaid wallet, no free tier stated: top up before calling the API - the docs say a wallet with no credit (no paid top-up and no active promo grant) "does not serve until it has some", and promo credit serves only while it lasts (https://app.umans.ai/offers/code/docs)
4. Set `UMANS_AI_API_KEY` in your .env file

### 2. Configure

```bash
export UMANS_AI_API_KEY=your-api-key
export UMANS_AI_MODEL=umans-coder   # optional — overrides the default model
export UMANS_AI_BASE_URL=https://api.code.umans.ai/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "umans-ai",
  model: "umans-coder",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider umans-ai
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "umans-ai",
  credentials: { umansAi: { apiKey: process.env.UMANS_AI_API_KEY } },
});
```

---

## Billing

Umans AI's pricing page (https://app.umans.ai/pricing) says "Pay per token. Top
up, create a key, and go." and "every request debits exactly what the model
used". The docs (https://app.umans.ai/offers/code/docs) say a wallet with no
credit at all — no paid top-up and no active promo grant — "does not serve until
it has some"; promo credit "serves while it lasts" and then the wallet suspends
until a paid top-up. A funded wallet that drains to its tier's floor (a small
negative allowance, $5 at Tiers 0-1) also suspends, and the docs call that "a
stop, not a 429". No page states a free tier or standing free credits, so the
entry records `no-free-tier`. The login page's "Sign up for free" link is about
creating an account; it is not a stated free allowance. The docs document
`GET /v1/usage` and a wallet-summary route on `app.umans.ai` for checking
balance and spend. Both need a key; `/v1/usage` was called only without one,
for the 401 probe under [Verification status](#verification-status).

Request limits sit on top of the balance. The docs give each wallet tier a
rolling five-hour request window and a concurrency cap: Tier 0 (first top-up)
2,000 requests and 4 in flight, Tier 1 ($50 lifetime top-up) 4,000 and 8, Tier 2
($250) 8,000 and 12, Tier 3 ($1,000) 16,000 and 16. They say hard enforcement
starts "around twice the stated number" and that each 429 lowers the account's
priority for about 30 minutes.

---

## Models

| Model                          | Context   | Max output | Vision | $/M in · out (cache read) | Notes                                                                                                                       |
| ------------------------------ | --------- | ---------- | ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `umans-coder` ⭐               | 1,048,576 | 131,072    | yes    | $0.15 / $0.50 ($0.03)     | Default — the vendor's own default; routing alias that today points at GLM-5.3-Flash and can change without a new id.       |
| `umans-glm-5.3`                | 1,048,576 | 131,072    | no     | $1.40 / $4.40 ($0.26)     | Fallback; Z.ai GLM 5.3, always thinks (reasoning cannot be turned off, dial low or high).                                   |
| `umans-deepseek-v4-flash-0731` | 1,048,576 | 393,216    | no     | $0.14 / $0.28 ($0.028)    | Fallback; the docs call it "The cheapest production model in the lineup". Thinks at low effort by default.                  |
| `umans-kimi-k3`                | 1,048,576 | 131,072    | yes    | $3.00 / $15.00 ($0.30)    | Fallback; Moonshot Kimi K3, native vision, reasoning at max by default, `none` turns it off.                                |
| `umans-glm-5.3-flash`          | 1,048,576 | 131,072    | yes    | $0.15 / $0.50 ($0.03)     | Z.ai GLM-5.3-Flash, native image and video understanding; the model `umans-coder` routes to today; `models.visionModel`.    |
| `umans-deepseek-v4.1-flash`    | 1,048,576 | 393,216    | yes    | $0.15 / $0.60 ($0.028)    | DeepSeek V4.1 Flash, native image understanding; four reasoning modes, `high` by default; listed in the docs' Models table. |
| `umans-flash`                  | 262,144   | 262,144    | yes    | $0.15 / $1.00 ($0.05)     | Qwen3.6-35B-A3B-FP8; the docs say to use it "not as a standalone coder"; counts as half a request against the tier window.  |

Context and per-model input and output prices come from an unauthenticated
`GET https://api.code.umans.ai/v1/models` call made 2026-09-29 (10 models; 7
curated into this catalog). Max output and vision come from an unauthenticated
`GET https://api.code.umans.ai/v1/models/info` call the same day — the docs
describe that endpoint as returning "context windows, pricing, and
capabilities" — as `max_completion_tokens` and `supports_vision`. The roster
itself gives no price unit; the docs' Models section states "$… per 1M tokens"
for the same figures on five of these models, and
[the pricing page](https://app.umans.ai/pricing) states "USD per 1M tokens"
for all six of its rows. Cache-read rates are not in the roster: they come from the
[docs](https://app.umans.ai/offers/code/docs),
[the organizations page](https://app.umans.ai/offers/code/docs/orgs) and the
pricing page, and the pricing page states the alias rule for `umans-coder`
("an alias for this model today: same rates, routed automatically").

`umans-coder` is the default because it is the vendor's own: every curl example
in the docs uses it and the docs' CLI launches it by default. The docs say it
"routes to our current pick, which changes as we evaluate models", so its
context, price and vision flag follow whatever it points at. The values above
are what it reported on 2026-09-29. If you need a fixed model, name one of the
other ids.

`models.defaultContextWindow` (262,144) and `models.defaultMaxOutputTokens`
(131,072) are the smallest context and max-output values among the seven
catalog models, so a model id that is not in the catalog gets a figure no
catalog model falls below. They are schema-required placeholders, not a
vendor-stated general cap: no Umans page states one.

**Reasoning levels** differ by model. From `/v1/models/info`: `umans-coder`,
`umans-glm-5.3` and `umans-glm-5.3-flash` accept low, high and max and cannot
turn reasoning off; `umans-kimi-k3`, `umans-deepseek-v4-flash-0731` and
`umans-deepseek-v4.1-flash` accept none, low, high and max; `umans-flash`
accepts none, low, medium and high. The docs say Kimi K3's sampling fields
(`temperature`, `top_p`) are fixed server-side and the gateway removes them
rather than failing the request.

**Fallback order** when the default is unavailable:
`umans-glm-5.3` → `umans-deepseek-v4-flash-0731` → `umans-kimi-k3`. The runtime
fallback model name the loader derives (`fallbacks[1]`) is
`umans-deepseek-v4-flash-0731`, the vendor's lowest-priced production model and
a text-only one.

**Retired ids.** The docs say `umans-kimi-k2.7` and `umans-glm-5.2` were retired
on September 10, 2026 and `umans-deepseek-v4-pro-0813` on September 14, 2026;
requests pinned to them "keep routing for a short grace tail, then a final hard
cutoff". They are not in this catalog.

**Vision:** the docs limit a conversation to 20 images across all messages on
`/v1/chat/completions`; past that "the request is rejected with a 400 before it
reaches a model". Vision flags are the vendor's own `supports_vision` values,
not an independent image probe.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Umans AI — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models`, HTTP 200, 10 models, 2026-09-29 — no key used                                                                                                                                                                                                                                                                                       |
| Billing                   | public docs and pricing pages describe a prepaid per-token wallet that "does not serve" without credit, and state no free tier, 2026-09-29                                                                                                                                                                                                                            |
| Auth-failure shape        | unauthenticated `GET /v1/usage` returned HTTP 401 with `{"error":{"type":"authentication_error","message":"Missing API key"}}`. `GET /v1/chat/completions` answered 405 Method Not Allowed, and no POST was sent, so the chat-completions error body is unobserved. `errorRules` match the documented statuses (`401`, `429`) and the documented "Unknown model" text |
| Tools / structured output | `supports_tools: true` on `/v1/models/info`; no page opened documents `response_format`. Neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                        |
| Reasoning                 | `reasoning_effort` and `reasoning_content` are documented; NeuroLink's thinking-level mapping onto them was not run                                                                                                                                                                                                                                                   |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=umans-ai` with a real key and record the result.                                                                                                                                               |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                                    | Cause                                                                                                                               | Fix                                                                                                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requests fail on every call, with no 429                   | The wallet has no credit, or drained to its tier's floor; the docs call this "a stop, not a 429"                                    | Top up at https://app.umans.ai/billing. The docs give no status code for it, so NeuroLink has no rule for it                                                  |
| HTTP 401                                                   | Key missing, expired or revoked, or set under the wrong variable name                                                               | Set `UMANS_AI_API_KEY`; generate a new key under Dashboard -> API Keys                                                                                        |
| HTTP 400 `Unknown model`                                   | The id does not exist; since September 2, 2026 an unknown id no longer runs on the default model                                    | Use an id exactly as listed by `GET /v1/models`. Ids start with `umans-`; names like `gpt-4o` or `deepseek-v4-flash` are not valid                            |
| HTTP 429                                                   | The wallet tier's request window or concurrency limit was exceeded                                                                  | Back off and retry — the docs call these 429s retryable — reduce parallel requests, or top up to raise the tier                                               |
| HTTP 400 on an image-heavy conversation                    | More than 20 images across the messages you resend                                                                                  | Keep only recent images and describe older ones in text                                                                                                       |
| Truncated answer, or no reasoning, with a small output cap | The docs say reasoning counts toward the output cap and thinking is turned off if the cap is too small for any meaningful reasoning | Raise the output cap. The docs name `max_completion_tokens` for this route; that field was not exercised through NeuroLink, so an output cap here is untested |
| Structured output ignored with tools attached              | `structuredOutputWithTools` is `false` on this entry — untested combination                                                         | NeuroLink omits `response_format` automatically whenever tools are present, before sending                                                                    |
| `umans-coder` behaves differently than before              | It is a routing alias and the docs say its target changes                                                                           | Name a fixed model id, or read the live target from `GET https://api.code.umans.ai/v1/models/info`                                                            |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
