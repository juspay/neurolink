---
title: BytePlus ModelArk Provider Guide
description: BytePlus ModelArk on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `seed-2-0-pro-260328`
keywords: byteplus, modelark, byteplus-modelark, openai-compatible, tier 2, provider setup, seed, ark
---

# BytePlus ModelArk Provider Guide

BytePlus ModelArk is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/byteplus-modelark.json`) rather than hand-written code.
That file is the source of truth for the data on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** The vendor's `GET /models` needs a key (an unauthenticated
> GET answers HTTP 401), so the model ids come from the vendor's public
> [Model list](https://docs.byteplus.com/en/docs/ModelArk/model-list) page and
> the roster has not been checked. No account was created and no API key was
> used to build this entry. `evidence.liveMatrix` is `null` until someone runs
> the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `byteplus-modelark` (aliases `byteplus`, `modelark`)
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the vendor's
  [Compatible with OpenAI API](https://docs.byteplus.com/api/docs/ModelArk/1330626)
  page says "ModelArk model APIs are largely compatible with the OpenAI SDK."
- **Base URL**: `https://ark.ap-southeast.bytepluses.com/api/v3`. The
  [Region availability](https://docs.byteplus.com/en/docs/ModelArk/region-availability)
  page lists a second base URL, `https://ark.eu-west.bytepluses.com/api/v3`;
  set `BYTEPLUS_MODELARK_BASE_URL` to use it. On that page, the section
  "Models supported in the EU region" has the sentence "The EU region currently
  supports the following models:" followed by a one-item list, `seed-2-0-lite`.
  Separately, a tip on the Model list page says "The seed-2-0 and
  seedream-5-0-lite models are also supported in the eu-west-1 region." The
  Region availability page also says "Platform-level resources, such as API keys
  and model activation status, are isolated by region."
- **Default model**: `seed-2-0-pro-260328`
- **Models in catalog**: 12, taken from the Text generation table of the Model
  list page. That table has 22 rows: 8 are marked Retired and are not in the
  catalog, and 2 of the other 14 (`deepseek-v4-pro-260425` and
  `deepseek-v4-flash-260425`) are left out to stay within the 12-model cap
- **Streaming**: supported — the
  [Chat API](https://docs.byteplus.com/en/docs/ModelArk/1494384) page documents
  a `stream` parameter that returns content "according to the SSE protocol" and
  ends with a `data: [DONE]` message
- **Tool calling**: `model-dependent` — the
  [Function call](https://docs.byteplus.com/en/docs/ModelArk/function-calling)
  page documents tools and points to the Model list's Tool use table for the
  models that support it
- **Tools while streaming**: supported — the Function call page has a Streaming
  output section whose example passes `tools` with `stream=True`
- **Structured output**: `structuredOutput` is `true` for the entry, in beta —
  the
  [Structured output (beta)](https://docs.byteplus.com/en/docs/ModelArk/structured-output-beta)
  page documents `response_format` with `json_schema` mode, and says "This
  capability is still in the beta phase. Proceed with caution when using it in
  the production environment." The Chat API page says of `response_format`
  "For models that support this parameter, see documentation." The Model list's
  Structured output (beta) section lists these non-retired model ids: `dola-seed-2-1-turbo-260628`, `seed-2-0-lite-260428`, `seed-2-0-mini-260428`, `seed-2-0-lite-260228`, `seed-2-0-mini-260215`, `deepseek-v4-1-flash-260910`, `deepseek-v4-pro-ga-260813`, `deepseek-v4-flash-ga-260731`.
  The NeuroLink default `seed-2-0-pro-260328` is not in that section.
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was run without credentials
- **Embeddings**: not declared — the Model list has a separate "Multimodal
  embedding" section with its own API, and this entry lists chat models
- **Thinking**: not declared — the
  [Deep reasoning](https://docs.byteplus.com/en/docs/ModelArk/deep-thinking)
  page documents a `thinking` request field, and this entry sets no
  thinking-level request parameter
- **Billing**: `free-tier` — the vendor's
  [Inference free trial](https://docs.byteplus.com/en/docs/ModelArk/free-inference-quota)
  page states a free inference trial quota for new users, see
  [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.byteplus.com/auth/signup and register as a BytePlus user — the Inference free trial page (https://docs.byteplus.com/en/docs/ModelArk/free-inference-quota) says "Register and authenticate as a BytePlus user."
2. Activate the models you want to call on the Model activation page (https://ai.byteplus.com/ark/region:ap-southeast-1/openManagement) — the Quick start (https://docs.byteplus.com/en/docs/ModelArk/quick-start) says "Go to the Model activation page to activate the models you need to use."
3. Create an API key at https://ai.byteplus.com/ark/region:ap-southeast-1/apiKey — the Quick start says to "create or obtain a ModelArk API key"; the API key page (https://docs.byteplus.com/en/docs/ModelArk/api-key) says "API Key is isolated by region. Select the appropriate region before creating and using the API Key for authentication."
4. Free trial, as the vendor states it: "ModelArk offers new users a free inference trial quota, allowing them to get started at no cost." (https://docs.byteplus.com/en/docs/ModelArk/free-inference-quota); the Free Tokens Only mode page (https://docs.byteplus.com/en/docs/ModelArk/free-tokens-only-mode) says "In this mode, calls to the inference API consume only the 500k free tokens granted by the platform."
5. Set `BYTEPLUS_MODELARK_API_KEY` in your .env file (the vendor's examples read `ARK_API_KEY`, which NeuroLink does not)

### 2. Configure

```bash
export BYTEPLUS_MODELARK_API_KEY=your-api-key
export BYTEPLUS_MODELARK_MODEL=seed-2-0-pro-260328   # optional — overrides the default model
export BYTEPLUS_MODELARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3   # optional
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "byteplus-modelark",
  model: "seed-2-0-pro-260328",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider byteplus-modelark
```

Per-request credentials are passed like this:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "byteplus-modelark",
  credentials: {
    byteplusModelark: { apiKey: process.env.BYTEPLUS_MODELARK_API_KEY },
  },
});
```

The Chat API page describes the `model` parameter as the "ID of the called
model" and says "For scenarios with multiple applications and fine-grained
management, we recommend calling by inference endpoint ID."

---

## Billing

The vendor's pages state:

- Free trial: "ModelArk offers new users a free inference trial quota, allowing
  them to get started at no cost."
  ([Inference free trial](https://docs.byteplus.com/en/docs/ModelArk/free-inference-quota))
- Free Tokens Only mode: "In this mode, calls to the inference API consume only
  the 500k free tokens granted by the platform."
  ([Free Tokens Only mode](https://docs.byteplus.com/en/docs/ModelArk/free-tokens-only-mode))
- With Free Tokens Only mode disabled: "When disabled: Online inference calls
  first consume the free quota. After the free quota is used up, usage is billed
  based on actual token consumption." (same page)
- Pricing: the [Pricing](https://docs.byteplus.com/en/docs/ModelArk/model-pricing)
  page says "Pay-as-you-go by token."

The entry records `free-tier`, the schema value closest to the stated free
inference trial quota.

---

## Models

| Model                          | Context | Vision | $/M in · out (cache hit) | Notes                                                                                                                                                                                                                           |
| ------------------------------ | ------- | ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seed-2-0-pro-260328` ⭐       | 256K    | yes    | $0.50 / $3.00 ($0.10)    | NeuroLink default. The Model list card that links to its detail page is captioned "Flagship general-purpose agentic model". Tools are listed as "Tool Calling". It is not in the Model list's Structured output (beta) section. |
| `dola-seed-2-1-turbo-260628`   | 256K    | yes    | $0.5 / $2.5 ($0.1)       | Fallback. Capabilities include Structured output.                                                                                                                                                                               |
| `seed-2-0-lite-260428`         | 256K    | yes    | $0.25 / $2.00 ($0.05)    | Fallback. Structured output is listed as "Structured output (Recommended: `json_schema` mode)".                                                                                                                                 |
| `seed-2-0-mini-260428`         | 256K    | yes    | $0.10 / $0.40 ($0.02)    | Fallback. Structured output is listed with "(Recommended: `json_schema` mode)".                                                                                                                                                 |
| `seed-2-0-lite-260228`         | 256K    | yes    | $0.25 / $2.00 ($0.05)    | Fallback and `models.fallbackModelName`. The id in the vendor's OpenAI-compatibility quickstart, its function-calling streaming example and its chat/completions curl.                                                          |
| `seed-2-0-mini-260215`         | 256K    | yes    | $0.10 / $0.40 ($0.02)    | Catalog entry.                                                                                                                                                                                                                  |
| `seed-2-0-code-preview-260328` | 256K    | yes    | $0.50 / $3.00 ($0.10)    | Catalog entry; status `preview` follows the word in the id.                                                                                                                                                                     |
| `glm-5-3-flash-260828`         | 1024K   | yes    | $0.15 / $0.5 ($0.03)     | Catalog entry.                                                                                                                                                                                                                  |
| `glm-5-2-260617`               | 1024K   | no     | $1.4 / $4.4 ($0.26)      | Catalog entry; `no` is a schema placeholder, not a vendor statement.                                                                                                                                                            |
| `deepseek-v4-1-flash-260910`   | 1024K   | yes    | $0.30 / $1.20 ($0.006)   | Catalog entry. Structured output is listed as "Structured output (json_object mode only)". Price shown is the "Peak hours" tier.                                                                                                |
| `deepseek-v4-pro-ga-260813`    | 1024K   | no     | $1.32 / $3.96 ($0.044)   | Fallback; `no` is a schema placeholder, not a vendor statement.                                                                                                                                                                 |
| `deepseek-v4-flash-ga-260731`  | 1024K   | no     | $0.44 / $1.32 ($0.014)   | Fallback; `no` is a schema placeholder, not a vendor statement.                                                                                                                                                                 |

Model ids, capabilities and context lengths come from the Text generation table
on the [Model list](https://docs.byteplus.com/en/docs/ModelArk/model-list)
page (retrieved 2026-09-29); prices come from the "Online inference (standard)"
table on the [Pricing](https://docs.byteplus.com/en/docs/ModelArk/model-pricing)
page (retrieved 2026-09-29), in USD per million non-audio tokens.

- **Tiered prices.** The Pricing page lists two "Prompt length" tiers for the
  Seed 2.0 rows, `[0, 128]` and `(128, 256]` (K tokens). The catalog stores the
  `[0, 128]` tier. For `seed-2-0-pro-260328` the `(128, 256]` tier is $1.00 in,
  $6.00 out and $0.20 cache-hit; the other Seed 2.0 rows' second tiers are in
  each model's `description` in the JSON. The `dola-seed-2-1-turbo-260628` row
  has one tier, `[0, 256]`, which is stored; the Pricing page's Model ID cell for
  that row reads `dola-seed-2-1-turbo`.
- **Context.** The Model list writes lengths as `256K` and `1024K`; the catalog
  stores 256000 and 1024000 (K read as 1,000). `models.defaultContextWindow`
  (128,000) and `models.defaultMaxOutputTokens` (4,096) are placeholders for model
  ids outside the catalog; 4,096 is the `max_tokens` default on the Chat API
  page. No per-model `maxOutputTokens` is set.
- **Vision.** `yes` means the Model list's Visual understanding table lists the
  model. `no`, for `glm-5-2-260617`, `deepseek-v4-pro-ga-260813` and
  `deepseek-v4-flash-ga-260731`, is a schema placeholder for a boolean the
  catalog requires; it is not a vendor statement.
- **Status.** The `status` field holds `production` (`preview` for the model id
  containing "preview"); that is a schema placeholder, not a vendor statement.

**Fallback order** when the default is unavailable:
`seed-2-0-lite-260228` → `seed-2-0-lite-260428` → `seed-2-0-mini-260428` →
`dola-seed-2-1-turbo-260628` → `deepseek-v4-pro-ga-260813` →
`deepseek-v4-flash-ga-260731`. The runtime fallback model name is set
explicitly to `seed-2-0-lite-260228`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for BytePlus ModelArk — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://ark.ap-southeast.bytepluses.com/api/v3/models` answered HTTP 401 on 2026-09-29; model ids are taken from the Model list page and the roster has not been checked                                    |
| Auth-failure shape        | unauthenticated `GET` of `/models` and of `/chat/completions` each answered HTTP 401 on 2026-09-29 with a JSON body whose `error.code` is `AuthenticationError` and `error.type` is `Unauthorized`; no POST was sent             |
| Billing                   | public pages state a free inference trial quota for new users and pay-as-you-go pricing by token, 2026-09-29 — see [Billing](#billing); no signup was performed                                                                  |
| Tools / structured output | documented on the Function call and Structured output (beta) pages; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                        |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=byteplus-modelark` with a real key and record the result. |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

The first six rows quote the vendor's
[Error codes](https://docs.byteplus.com/en/docs/ModelArk/error-codes) page (rows
1 to 4 and 6) or
[Free Tokens Only mode](https://docs.byteplus.com/en/docs/ModelArk/free-tokens-only-mode)
page (row 5); the last row describes NeuroLink's own behaviour.

| Symptom                                       | Cause                                                                                                              | Fix                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 401 `AuthenticationError`                | "The API key or AK/SK in the request is missing or invalid."                                                       | "Please check the authentication credentials or troubleshoot based on the API document."                                         |
| HTTP 404 `ModelNotOpen`                       | "Your account %s has not activated the model %s."                                                                  | "Please activate the model service in the Ark Console."                                                                          |
| HTTP 404 `InvalidEndpointOrModel.NotFound`    | "The model or inference endpoint %s does not exist or you do not have access to it."                               | —                                                                                                                                |
| HTTP 429 `QuotaExceeded`                      | "The account (%s) has exhausted the free trial quota of the model (%s)."                                           | "To continue using the service, go to the ModelArk console and activate the corresponding model service on the Activation page." |
| HTTP 429 `SetLimitExceeded`                   | "Your account [%s] has reached the set inference limit for the [%s] model, and the model service has been paused." | "To continue using this model, please visit the Model Activation page to adjust or close the "Free Tokens Only Mode"."           |
| HTTP 403 `AccountOverdueError`                | "The request failed because your account has an overdue balance."                                                  | "To continue using the service, please go to the BytePlus Billing Center to recharge."                                           |
| Structured output ignored with tools attached | `structuredOutputWithTools` is `false` on this entry                                                               | NeuroLink omits `response_format` automatically when tools are present, before sending                                           |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
