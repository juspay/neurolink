---
title: STACKIT Provider Guide
description: STACKIT on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `Qwen/Qwen3-VL-235B-A22B-Instruct-FP8`
keywords: stackit, ai model serving, openai-compatible, tier 2, provider setup, qwen, llama, gpt-oss, gemma
---

# STACKIT Provider Guide

STACKIT is a **Tier-2 catalog provider**: its integration is one JSON file
(`src/lib/providers/catalog/stackit.json`) rather than hand-written code.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** STACKIT's `GET /models` needs a key (an unauthenticated
> `GET /v1/models` on 2026-09-29 answered HTTP 403), so the model ids come from
> STACKIT's public documentation and the roster has not been checked. No
> account was created and no API key was used to build it.
> `evidence.liveMatrix` is `null` until someone runs the live capability
> matrix with a real key (see [Verification status](#verification-status)
> below).

---

## Key Facts

- **Provider id**: `stackit`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the model rows on
  the [Available Shared Models](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/)
  page show Specification "OpenAI-compatible" and the endpoints
  `POST /chat/completions`, `POST /completions` and `GET /models`. The sample
  reply shown under the `POST /v1/chat/completions` curl request on the
  [Getting started](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/getting-started/getting-started-with-shared-models/)
  page reads `"object":"text_completion"` and `"choices":[{"index":0,"text":`;
  no POST request was sent while building this entry
- **Base URL**: `https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1`
- **Default model**: `Qwen/Qwen3-VL-235B-A22B-Instruct-FP8`
- **Models in catalog**: 6 chat models, taken from the "Full Name:" headings
  of the Available Shared Models page (retrieved 2026-09-29)
- **Streaming**: not declared (`false`); no streaming request was sent
- **Tool calling**: `model-dependent`. The Features cell reads "Tool calling
  enabled" on the Qwen3-VL 235B and Llama 3.3 70B rows and "Tool calling &
  Reasoning enabled" on the other four catalogued rows. The
  [tool-calling how-to](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/how-tos/integration-of-tool-calling/)
  is a LangChain example that prints `tool_call_response.tool_calls`
- **Tools while streaming**: not declared (`false`)
- **Structured output**: not declared (`false`). The release note of Dec 10,
  2025 says of `openai/gpt-oss-120b`: "The model provides full
  chain-of-thought (CoT) and support Structured Outputs." The catalog's
  `structuredOutput` flag applies to the provider as a whole, so it stays
  `false`
- **Structured output + tools together**: not declared (`false`) — no
  combined probe was run without credentials
- **Embeddings**: not declared on this catalog entry. STACKIT does list two
  embedding models with a `POST /embeddings` endpoint
  (`intfloat/e5-mistral-7b-instruct`, `Qwen/Qwen3-VL-Embedding-8B`), but
  NeuroLink's generic `ConfiguredOpenAICompatProvider` does not implement
  `embed()`/`embedMany()`, so this flag tracks that, not the vendor's own API
  surface
- **Thinking**: not declared (`false`); the per-model Features text is
  recorded in the table below
- **Billing**: `no-free-tier` — see [Billing](#billing) below
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://portal.stackit.cloud and log in to the customer portal — the [Getting started](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/getting-started/getting-started-with-shared-models/) page says "To enable AI Model Serving login to the Customer portal and click at the sidebar on the left on AI Model Serving." and lists a STACKIT customer account, a STACKIT user account and a STACKIT project as prerequisites
2. Enable AI Model Serving, click Create token, enter a token name and optionally a lifetime in days, and confirm with "Order fee-based" ("To confirm click on Order fee-based."); the same page says "You can not retrieve the token again after closing the pane", so copy it when it is shown
3. Billing as the vendor states it: the May 6, 2025 [release note](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/release-notes/) says "STACKIT AI Model Serving offers you easy pay-as-you-go access to proven GenAI models"; the [product page](https://stackit.com/en/products/data-ai/stackit-ai-model-serving) offers "Register for a free trial access" — see [Billing](#billing)
4. Set `STACKIT_API_KEY` in your .env file (the docs' examples read `STACKIT_MODEL_SERVING_AUTH_TOKEN` and `STACKIT_MODEL_SERVING_API_KEY`, which NeuroLink does not read)

### 2. Configure

```bash
export STACKIT_API_KEY=your-auth-token
export STACKIT_MODEL=Qwen/Qwen3-VL-235B-A22B-Instruct-FP8   # optional — overrides the default model
export STACKIT_BASE_URL=https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "stackit",
  model: "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider stackit
```

Per-request credentials:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "stackit",
  credentials: { stackit: { apiKey: process.env.STACKIT_API_KEY } },
});
```

---

## Billing

What the vendor's pages state, quoted as they appear:

- Getting started, token creation: "To confirm click on Order fee-based." The
  Manage auth tokens page's token-creation steps say "Click on Order
  fee-based."
- Release note, May 6, 2025: "STACKIT AI Model Serving offers you easy
  pay-as-you-go access to proven GenAI models"
- [Product page](https://stackit.com/en/products/data-ai/stackit-ai-model-serving),
  advantages list: "Operate GenAI applications cost-effectively with our
  token-based billing."
- Product page, heading "Register for a free trial access": "All registrations
  are manually checked by us. If you qualify, you will receive your personal
  token to use STACKIT AI Model Serving within 24 hours. The trial period ends
  automatically after 30 days."

The product page's "STACKIT AI Model Serving price table" (Region cell
"Germany South") shows these text-model rows, quoted as the cells read:

| SKU                                      | Billing          | "Price per hour" cell |
| ---------------------------------------- | ---------------- | --------------------- |
| `Model Serving-llm-standard-input-EU01`  | mio input token  | 0.15000000000 €       |
| `Model Serving-llm-standard-output-EU01` | mio output token | 0.25000000000 €       |
| `Model Serving-llm-plus-input-EU01`      | mio input token  | 0.45000000000 €       |
| `Model Serving-llm-plus-output-EU01`     | mio output token | 0.65000000000 €       |
| `Model Serving-llm-premium-input-EU01`   | mio input token  | 1.50000000000 €       |
| `Model Serving-llm-premium-output-EU01`  | mio output token | 1.75000000000 €       |

The Available Shared Models page gives each chat model a Category cell
(`LLM-Premium`, `LLM-Plus` or `LLM-Standard`), shown in the table below.

The entry records `billingPolicy: no-free-tier` because the catalog schema
takes one of three values and the token-creation step says "To confirm click
on Order fee-based."; the free trial above is a separate, manually checked
registration. The entry leaves `pricingPerMTok` empty: the vendor's prices are
in euro and are recorded here as the vendor shows them.

---

## Models

| Model                                        | Category       | Context | Max output | Vision          | RPM / TPM   | Notes                                                                                                                                                     |
| -------------------------------------------- | -------------- | ------- | ---------- | --------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Qwen/Qwen3-VL-235B-A22B-Instruct-FP8` ⭐    | `LLM-Premium`  | 200K    | 16384      | yes (10 images) | 30 / 350000 | NeuroLink default. Features "Tool calling enabled". The row's text: "Meet Qwen3-VL – the most powerful vision-language model in the Qwen series to date." |
| `cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic` | `LLM-Plus`     | 128K    | 4096       | no              | 80 / 200000 | Fallback. Features "Tool calling enabled". The model in the Getting started curl example ("In this guide we use Llama 3.3 70B.").                         |
| `openai/gpt-oss-120b`                        | `LLM-Plus`     | 131K    | 8192       | no              | 30 / 200000 | Fallback. Features "Tool calling & Reasoning enabled".                                                                                                    |
| `Qwen/Qwen3.8-27B`                           | `LLM-Plus`     | 262K    | 16384      | yes (10 images) | 45 / 350000 | Fallback. Features "Tool calling & Reasoning enabled"; Thinking budget "8192 Token".                                                                      |
| `google/gemma-4-31B-it`                      | `LLM-Plus`     | 256K    | 4096       | yes (10 images) | 80 / 200000 | Fallback. Features "Tool calling & Reasoning enabled".                                                                                                    |
| `openai/gpt-oss-20b`                         | `LLM-Standard` | 131K    | 8192       | no              | 80 / 200000 | Fallback. Features "Tool calling & Reasoning enabled". Row note: "We recommend configuring retries for tool calling to improve reliability."              |

The figures in the table are cells of the Available Shared Models page
(retrieved 2026-09-29); the six rows show Type "Chat" and Status "Supported". The
page writes context as "200K Token", "128K Token", "131K Token", "262K Token"
and "256K Token"; the entry records those as 200000, 128000, 131000, 262000
and 256000, reading K as thousands. Vision comes from each row's Modalities
cell ("Input are text and image and Output is text." for the three vision
rows, "Input and output are text." for the others). RPM and TPM are the page's
"RPM limit" and "TPM limit" cells; the
[rate-limits page](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/how-tos/rate-limits-on-shared-models-_stackit-ai-model-serving/)
says limits are applied per STACKIT project.

`models.defaultContextWindow` (128000) and `models.defaultMaxOutputTokens`
(4096) are placeholders the vendor does not publish as general values; they
apply to model ids outside the catalog and equal the Context length "128K
Token" and Maximum Generation "4096 Token" cells of the Llama 3.3 70B row.

The `status` field of the six catalogued models holds `production`: the
catalog schema requires a status (`production`, `preview` or `retired`) and the
vendor's rows show Status "Supported".

**Fallback order** when the default is unavailable:
`cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic` → `openai/gpt-oss-120b` →
`Qwen/Qwen3.8-27B` → `google/gemma-4-31B-it` → `openai/gpt-oss-20b`. The
runtime fallback model name the loader derives (`fallbacks[1]`) is
`openai/gpt-oss-120b`.

**Left out of the catalog:**

- Two chat rows show Status "Deprecated": `Qwen/Qwen3.6-27B` and
  `google/gemma-3-27b-it`. The [release notes](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/release-notes/)
  say "We kindly ask all customers to migrate their workloads to the new model
  Qwen/Qwen3.8-27B before December 08, 2026." and "We kindly ask all customers
  to migrate their workloads to the new model google/gemma-4-31B-it before 14
  October 2026."
- Two embedding rows (`intfloat/e5-mistral-7b-instruct`,
  `Qwen/Qwen3-VL-Embedding-8B`), for the embeddings reason in Key Facts.

The [Use the models](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/how-tos/use-the-models/)
page says "STACKIT AI Model Serving provides an OpenAI-compatible API, making
it easy to integrate with existing tools and libraries." and "Important: The
API is stateless and does not maintain session information."
The Available Shared Models page gives a request body limit: "The maximum
allowed request body size is 20 MiB."

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for STACKIT — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET /v1/models` answered HTTP 403 (content-length 0, no body) on 2026-09-29, so the roster was not read; the six ids come from the Available Shared Models page, retrieved 2026-09-29 — no key used                                                                                 |
| Billing                   | vendor pages quoted in [Billing](#billing), 2026-09-29 — no signup performed                                                                                                                                                                                                                         |
| Auth-failure shape        | unauthenticated GETs of `/v1/models`, `/v1/chat/completions` and `/v1` each answered HTTP 403 with content-length 0 and no body on 2026-09-29, so no error code was observable; no POST was sent. `errorRules` carry the two statuses the vendor's pages state: 404 (FAQ) and 429 (rate-limits page) |
| Chat response shape       | The sample reply shown under the Getting started page's `POST /v1/chat/completions` curl request reads `"object":"text_completion"` and `"choices":[{"index":0,"text":`; no POST request was sent, so no chat-completions reply was read directly                                                    |
| Tools / structured output | per-model Features cells and the tool-calling how-to are recorded above; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                       |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=stackit` with a real key and record the result.                                                                               |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row is what a STACKIT page says, with the page named.

| Symptom                                          | What the vendor's page says                                                                                                                                                                                                                                     | Page                                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 404                                         | "Most likely this is due to an incorrect “model” parameter in the request body." and "This means a chat model cannot be used to compute embeddings, or vice versa."                                                                                             | [FAQ](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/faq/)                                                                    |
| HTTP 429                                         | "Once you hit a rate limit (RPM or TPM)" the API responds with `429 Too Many Requests`; a heading on the page reads "Implement exponential backoff with jitter"; the page lists the headers `x-ratelimit-remaining-requests` and `x-ratelimit-remaining-tokens` | [Rate limits](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/how-tos/rate-limits-on-shared-models-_stackit-ai-model-serving/) |
| Token does not work                              | Under "Why does my authentication token (aka API-key) not work?": "API base URL: https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1" and "API key / Authentication token / Secret key: STACKIT AI Model Serving Auth Token"                        | [FAQ](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/faq/)                                                                    |
| Output truncated                                 | "If it is set to "length", the generation was stopped due to the token cap." (the `finish_reason` field)                                                                                                                                                        | [FAQ](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/faq/)                                                                    |
| `LengthFinishReasonError` with structured output | "This problem can be solved by adjusting the frequency_penalty parameter. A value of 0.7 or higher has proven to be sufficient."                                                                                                                                | [FAQ](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/faq/)                                                                    |
| Llama 3.3 70B produces a hallucinated tool call  | Under known issues, for `cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic`: "To avoid hallucinated tool calls, do not send the tools parameter with an empty list."                                                                                                   | [FAQ](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/faq/)                                                                    |
| Tool calling on GPT-OSS 20B                      | "We recommend configuring retries for tool calling to improve reliability."                                                                                                                                                                                     | [Available Shared Models](https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/)                     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
