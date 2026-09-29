---
title: Vispark Provider Guide
description: Vispark on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `vispark/vision-large`
keywords: vispark, vispark-lab, openai-compatible, tier 2, provider setup, vision
---

# Vispark Provider Guide

Vispark is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/vispark.json`) rather than hand-written code.
The catalog values on this page come from that file.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** The fields below come from the text of Vispark's public
> site (https://lab.vispark.in/) and unauthenticated GET requests to
> `https://api.lab.vispark.in/v1` — no account was created and no API key was
> used to build it. `evidence.liveMatrix` is `null` until someone runs the live
> capability matrix with a real key (see
> [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `vispark`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the site's OpenAI
  Compatibility panel says "This model is compatible with OpenAI-compatible
  clients."
- **Base URL**: `https://api.lab.vispark.in/v1` — that panel gives the Base URL
  `https://api.lab.vispark.in`. Unauthenticated GETs made 2026-09-29:
  https://api.lab.vispark.in/v1/models and https://api.lab.vispark.in/models
  returned the same 3-model body; https://api.lab.vispark.in/v1/chat/completions
  and https://api.lab.vispark.in/chat/completions both answered HTTP 405
- **Default model**: `vispark/vision-large` (NeuroLink default)
- **Models in catalog**: 3 — the roster returned 3 models on 2026-09-29
- **Streaming**: `true` — the Vision entry on the site reads "Supports up to 1
  million tokens per request with real-time streaming capabilities."
- **Tool calling**: `true` — the Vision entry reads "Supports Tool Calling and
  Continual Learning; updates weights in real-time.", and the roster lists
  `tools` in `supported_features` for the three models. No POST request was sent
- **Tools while streaming**: `false` in the catalog — the site's "Tool Calling
  Guide" has a "Streaming with Tool Calls" section whose sample chunk shows
  `"type": "tool_calls"` and `"finished": true`. No POST request was sent
- **Structured output**: `false` in the catalog — the roster lists `json_mode`
  and `structured_outputs` in `supported_features`. No POST request was sent
- **Structured output + tools together**: `false` in the catalog. No POST request
  was sent
- **Embeddings**: `false` in the catalog — the roster's `output_modalities` for
  the three models is `text`
- **Thinking**: `false` in the catalog — the roster lists `reasoning` in
  `supported_features`. No POST request was sent
- **Billing policy field**: `no-free-tier` is a schema placeholder (the schema
  has no unknown value), not a vendor statement; the unit strings the site
  shows are quoted under [Billing](#billing)
- **Key format**: `apiKeyFormat` is `null` in the catalog

---

## Quick Start

### 1. Get an API key

1. Visit: https://lab.vispark.in/profile and sign in — the playground text reads "Sign in to run this model.", and the site links the Vispark account system at https://account.vispark.in
2. Open API Keys in the profile sidebar (the panel is titled "API Keys" with the subtitle "Manage your API keys"), choose "Add Key" and complete the "Create New API Key" dialog
3. Authentication is HTTP Bearer: the OpenAI Compatibility panel says "Use your standard API Key as a Bearer Token." and shows `Authorization: Bearer <your_api_key>`. The site's developer-guide text for the Vision model also lists "Endpoint: /model/text/vision" and "Authentication: X-API-Key: your_api_key_here", and the ephemeral-key panel "Using on Model Endpoints" shows an X-API-Key header and lists "POST /chat/completions" under "Supported endpoints:". Neither header scheme was exercised: no POST request was sent
4. Billing as the site shows it: the Account tab of the profile page has a "Buy More Units" panel with the strings "₹1 (INR) = 1 unit" and "$1 (USD) = ~95 units"
5. Set `VISPARK_API_KEY` in your .env file

### 2. Configure

```bash
export VISPARK_API_KEY=your-api-key
export VISPARK_MODEL=vispark/vision-large   # optional — overrides the default model
export VISPARK_BASE_URL=https://api.lab.vispark.in/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "vispark",
  model: "vispark/vision-large",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider vispark
```

Per-request credentials are passed like this:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "vispark",
  credentials: { vispark: { apiKey: process.env.VISPARK_API_KEY } },
});
```

---

## Billing

The Account tab of https://lab.vispark.in/profile has a "Buy More Units" panel
with the strings "₹1 (INR) = 1 unit" and "$1 (USD) = ~95 units", and the
Insufficient Units dialog carries the text "~$0.01 = ₹1 = 1 unit." The Vision model's price text
is quoted in [Models](#models). The `no-free-tier` value in the catalog is a
schema placeholder, not a vendor statement.

---

## Models

| Model                     | Context   | Max output | Vision | $/M in · out   | Notes                                                                                                                                                                                                       |
| ------------------------- | --------- | ---------- | ------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vispark/vision-large` ⭐ | 1,000,000 | 65,536     | yes    | $7.37 / $22.11 | NeuroLink default. Roster description: "Vision Large: India's most advanced foundational intelligence." The site's size entry reads "Slowest processing but highest intelligence and accuracy".             |
| `vispark/vision-medium`   | 1,000,000 | 65,536     | yes    | $4.21 / $12.63 | Fallback. Roster description: "Vision Medium: A versatile foundational model built for the world on Indian infrastructure." The site's size entry reads "Balanced processing speed with good intelligence". |
| `vispark/vision-small`    | 1,000,000 | 65,536     | yes    | $1.05 / $3.16  | Fallback. Roster description: "Vision Small: India's fast and efficient foundational AI." The site's size entry reads "Fastest processing speed with basic intelligence".                                   |

Context, max output, prices and modalities come from an unauthenticated
`GET https://api.lab.vispark.in/v1/models` call made 2026-09-29 (3 models; 3 in
this catalog): `context_length` 1000000, `max_output_length` 65536, and
`input_modalities` `text`, `image`, `audio`, `video`, `file` for the three
models. The `$/M` figures are the roster's `pricing.prompt` and
`pricing.completion` strings times 1,000,000 (`"0.00000737"` and
`"0.00002211"` for `vispark/vision-large`, `"0.00000421"` and `"0.00001263"`
for `vispark/vision-medium`, `"0.00000105"` and `"0.00000316"` for
`vispark/vision-small`).

The site's price text for the Vision sizes, from the script
https://lab.vispark.in/assets/index-WmfFPhvJ.js that https://lab.vispark.in/
loads (retrieved 2026-09-29):

| Size     | Price text as the site shows it                                            |
| -------- | -------------------------------------------------------------------------- |
| `small`  | "₹10 input/₹30 output per 100k tokens. Minimum 600 input tokens charged."  |
| `medium` | "₹40 input/₹120 output per 100k tokens. Minimum 600 input tokens charged." |
| `large`  | "₹70 input/₹210 output per 100k tokens. Minimum 600 input tokens charged." |

For `vispark/vision-small`, ₹10 per 100k input tokens is ₹100 per 1M, which at
"$1 (USD) = ~95 units" is about $1.05, the roster's figure.

**Vision:** the three models are `vision: true`. The roster lists `image` in
`input_modalities`, and the site's playground text reads "Supports images,
audio, video, and PDFs (max 25MB each)". The Vision model's Limitations text
reads "Combined content: 980,000 tokens maximum".

Each model's `status` in the JSON is `production`, a placeholder for a value the
catalog schema requires; it is not a vendor statement.

`models.defaultContextWindow` (128,000) and `models.defaultMaxOutputTokens`
(16,384) are NeuroLink placeholders for model ids outside the catalog, not
vendor figures.

**Fallback order** when the default is unavailable:
`vispark/vision-medium` → `vispark/vision-small`. The runtime fallback model
name the loader derives (`fallbacks[1]`) is `vispark/vision-small`.

---

## Vendor-stated error handling

These lines are quoted from the Vision model's Limitations text on the site
(script https://lab.vispark.in/assets/index-WmfFPhvJ.js, retrieved 2026-09-29).
They are the vendor's wording, not NeuroLink behaviour, and the catalog's
`errorRules` (401, 402, 429) carry them:

- "Check HTTP status codes (200, 400, 401, 402, 429)"
- "Handle rate limiting with exponential backoff"
- "Validate API keys and sufficient units"
- "API rate limit: 240 requests/minute"

The site's script also uses "Insufficient units for this operation" as the
fallback message for HTTP 402.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Vispark — **docs- and roster-verified, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models`, HTTP 200, 3 models, 2026-09-29 — no key used; `GET https://api.lab.vispark.in/models` returned the same body                                                                                                                                                                  |
| Billing                   | public script strings "₹1 (INR) = 1 unit" and "$1 (USD) = ~95 units" from the Buy More Units panel, 2026-09-29                                                                                                                                                                                                  |
| Auth-failure shape        | unauthenticated `GET https://api.lab.vispark.in/v1/chat/completions` returned HTTP 405 with an HTML body titled "405 Method Not Allowed"; no `authProbe` is recorded, and `errorRules` carry the status codes and sentences of the site's Limitations text                                                      |
| Tools / structured output | the roster lists `tools`, `json_mode` and `structured_outputs` in `supported_features`, and the Vision entry reads "Supports Tool Calling and Continual Learning; updates weights in real-time."; none was exercised, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false` |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=vispark` with a real key and record the result.                                                                                          |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
