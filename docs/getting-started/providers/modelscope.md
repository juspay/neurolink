---
title: ModelScope Provider Guide
description: ModelScope on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `Qwen/Qwen3.5-35B-A3B`
keywords: modelscope, api-inference, openai-compatible, tier 2, provider setup, qwen
---

# ModelScope Provider Guide

ModelScope is a **Tier-2 catalog provider**: OpenAI-compatible, defined by one
JSON file (`src/lib/providers/catalog/modelscope.json`) rather than
hand-written code. This page is written from that file.

> **Verification status:** this entry is **docs- and roster-verified, not yet
> live-verified.** The fields below come from ModelScope's own public
> documentation and unauthenticated GET requests — no account was created and
> no API key was used to build it. `evidence.liveMatrix` is `null` until
> someone runs the live capability matrix with a real key (see
> [Verification status](#verification-status) below).

The docs text on this page was read on 2026-09-29 from the raw document files
that the docs site loads, because the rendered pages at `modelscope.cn/docs`
are a JavaScript shell. The English build is
`https://resouces.modelscope.cn/document/docdata/2026-9-28_15-50-EN/dist/model-service/API-Inference/intro/intro_EN.md`
(and the matching `limits`, `codewhale`, `magicube`, `accounts/registration` and
`accounts/token` files); the Chinese build is under
`https://resouces.modelscope.cn/document/docdata/2026-9-28_15-49-CN/dist/index.json`
(its `model-service/API-Inference/intro/intro_CN.md` sibling holds the Chinese intro page).
Quotes below are English unless a Chinese build is named.

---

## Key Facts

- **Provider id**: `modelscope`
- **Protocol**: OpenAI-compatible (`/chat/completions`) — the intro page
  ([docs](https://modelscope.cn/docs/model-service/API-Inference/intro)) says
  "ModelScope's API-Inference currently provides OpenAI API-compatible
  interfaces for large language models."
- **Base URL**: `https://api-inference.modelscope.cn/v1`
- **Default model**: `Qwen/Qwen3.5-35B-A3B`
- **Models in catalog**: 12 (selected from the 35-model roster)
- **Streaming**: supported — the intro page's chat example calls
  `client.chat.completions.create(...)` with `stream=True`
- **Vision**: `vision: true` on `Qwen/Qwen3.5-35B-A3B` — the intro page's
  "Vision Models" example calls that id with an `image_url` content part. It is
  also `true` on the other three Qwen3.5 ids (the intro page says "integrated
  models like Qwen3.5 that support vision") and on `Qwen/Qwen3.8-27B`,
  `Qwen/Qwen3.8-Flash-Next`, `MiniMax/MiniMax-M3` and
  `stepfun-ai/Step-3.7-Flash` (ModelScope's public model API lists their task
  as `image-text-to-text`); see [Models](#models)
- **Tool calling**: `false`
- **Tools while streaming**: `false`
- **Structured output**: `false`
- **Structured output + tools together**: `false` — no combined request was
  sent, because no API key was used
- **Embeddings**: `false`
- **Thinking**: `true` — ModelScope's Codewhale integration page
  (https://modelscope.cn/docs/ecosystem-integrations/api-usage/codewhale) says
  "Qwen and GLM series models support `reasoning_content` streaming output"
- **Billing**: `free-tier` — see [Billing](#billing) below

---

## Quick Start

### 1. Get an API key

1. Visit: https://modelscope.cn/home and register or log in with the "Log in/Register" button in the top right corner (https://modelscope.cn/docs/accounts/registration)
2. Bind an Alibaba Cloud account and complete real-name verification: "After account registration, you must bind your Alibaba Cloud account and complete real-name verification before using API-Inference." (https://modelscope.cn/docs/model-service/API-Inference/intro; binding steps: https://modelscope.cn/docs/accounts/aliyun-binding-and-authorization)
3. Create an access token at https://modelscope.cn/my/myaccesstoken; the token guide (https://modelscope.cn/docs/accounts/token) has you specify a validity period, "Long-term use" or "Short-term use"
4. Free for registered users: "API-Inference is provided free of charge to registered ModelScope users." (intro page); the limits page (https://modelscope.cn/docs/model-service/API-Inference/limits) states that API Inference "implements certain limits on usage quotas and concurrency"
5. Set `MODELSCOPE_API_KEY` in your .env file

### 2. Configure

```bash
export MODELSCOPE_API_KEY=your-access-token
export MODELSCOPE_MODEL=Qwen/Qwen3.5-35B-A3B   # optional — overrides the default model
export MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn/v1   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "modelscope",
  model: "Qwen/Qwen3.5-35B-A3B",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider modelscope
```

Per-request credentials use the same shape as the other catalog providers:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "modelscope",
  credentials: { modelscope: { apiKey: process.env.MODELSCOPE_API_KEY } },
});
```

---

## Billing

The entry records `free-tier`. What the vendor's pages say:

- Intro page: "API-Inference is provided free of charge to registered
  ModelScope users."
- Limits page (https://modelscope.cn/docs/model-service/API-Inference/limits):
  "The free inference API is powered by Alibaba Cloud computing resources."
  and "Your ModelScope account must first be linked to an Alibaba Cloud
  account."
- Limits page: "Please do not use it for online tasks requiring high
  concurrency or SLA guarantees". It continues "If you have commercial usage
  requirements, we recommend using APIs from commercial platforms."
- Limits page: "The allowed concurrency for different models will be
  dynamically rate-limited according to platform load"
- Limits page: "API Inference calls can be redeemed by magicubes." with three
  cost tiers, "Lightweight models: ~0.5 Magicubes per call", "Standard models:
  ~1 Magicube per call" and "Flagship models: ~2 Magicubes per call".
- Magicube page (https://modelscope.cn/docs/magicube/intro): Magicubes can be
  redeemed for "Civision inference, Civision training, and API Inference
  services". Its earning table lists "Daily Login Bonus" (action "Sign in",
  reward "200 Magicubes/day") and "Account Linking Bonus" (action "Link
  Alibaba Cloud account", reward "50 Magicubes/day").

---

## Models

| Model                                   | `vision` | Notes                                                                                                                                                                                                                                                                                                       |
| --------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Qwen/Qwen3.5-35B-A3B` ⭐               | true     | NeuroLink default. The id used in the intro page's chat, Anthropic-compatible and Vision Models examples; `models.visionModel`.                                                                                                                                                                             |
| `Qwen/Qwen3.5-27B`                      | true     | Fallback. Named in the Chinese intro page's Responses API example and in the LangChain integration page's examples (https://modelscope.cn/docs/ecosystem-integrations/api-usage/langchain). The intro page says "integrated models like Qwen3.5 that support vision". Model API task: `image-text-to-text`. |
| `deepseek-ai/DeepSeek-V4-Pro-0813`      | false    | Fallback. Listed on the roster. Model API task: `text-generation`.                                                                                                                                                                                                                                          |
| `ZhipuAI/GLM-5.2`                       | false    | Fallback. Listed on the roster. Model API task: `text-generation`.                                                                                                                                                                                                                                          |
| `Qwen/Qwen3.5-397B-A17B`                | true     | Listed on the roster. The intro page says "integrated models like Qwen3.5 that support vision". Model API task: `image-text-to-text`.                                                                                                                                                                       |
| `Qwen/Qwen3.5-122B-A10B`                | true     | Listed on the roster. The intro page says "integrated models like Qwen3.5 that support vision". Model API task: `image-text-to-text`.                                                                                                                                                                       |
| `deepseek-ai/DeepSeek-V4-Flash-0731`    | false    | Listed on the roster. Model API task: `text-generation`.                                                                                                                                                                                                                                                    |
| `MiniMax/MiniMax-M3`                    | true     | Listed on the roster. Model API task: `image-text-to-text`.                                                                                                                                                                                                                                                 |
| `stepfun-ai/Step-3.7-Flash`             | true     | Listed on the roster. Model API task: `image-text-to-text`.                                                                                                                                                                                                                                                 |
| `Qwen/Qwen3.8-27B`                      | true     | Listed on the roster. Model API task: `image-text-to-text`.                                                                                                                                                                                                                                                 |
| `mistralai/Mistral-Large-Instruct-2407` | false    | Listed on the roster. Model API task: `text-generation`.                                                                                                                                                                                                                                                    |
| `Qwen/Qwen3.8-Flash-Next`               | true     | Listed on the roster. Model API task: `image-text-to-text`.                                                                                                                                                                                                                                                 |

The ids come from an unauthenticated
`GET https://api-inference.modelscope.cn/v1/models` call made 2026-09-29
(HTTP 200, 35 models; 12 of them are in this catalog). Each roster
entry has the fields `id`, `object` (an empty string), `owned_by` (`system`)
and `created`. "Model API task" is the `Data.Tasks` field of an unauthenticated
`GET https://www.modelscope.cn/api/v1/models/<model id>` made 2026-09-29. The
catalog does not set a per-model context window, output limit or price.
`models.defaultContextWindow` (32,768) and `models.defaultMaxOutputTokens`
(4,096) are placeholders.

**Fallback order** when the default is unavailable:
`Qwen/Qwen3.5-27B` → `deepseek-ai/DeepSeek-V4-Pro-0813` → `ZhipuAI/GLM-5.2`.
The runtime fallback model name (`models.fallbackModelName`) is
`Qwen/Qwen3.5-27B`.

**Vision:** `vision: true` is set for `Qwen/Qwen3.5-35B-A3B`, the id the
intro page's Vision Models example calls with an `image_url` content part, for
the other Qwen3.5 ids on the basis of the intro page sentence quoted in the
table, and for `Qwen/Qwen3.8-27B`, `Qwen/Qwen3.8-Flash-Next`,
`MiniMax/MiniMax-M3` and `stepfun-ai/Step-3.7-Flash` on the basis of their
model API task, `image-text-to-text`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for ModelScope — **docs- and roster-verified, not
live-verified**:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | unauthenticated `GET /v1/models`, HTTP 200, 35 models, 2026-09-29 — no key used                                                                                                                                                                                                                                                                                                                                                                                 |
| Billing               | intro page: "API-Inference is provided free of charge to registered ModelScope users."; limits page: "free of charge", 2026-09-29                                                                                                                                                                                                                                                                                                                               |
| Auth-failure shape    | unauthenticated `GET /v1/tasks/abc` (the AIGC task-polling route used in the intro page's example) answered HTTP 401 with the JSON body `{"errors":{"message":"Authentication failed, please make sure that a valid ModelScope token is supplied."},"request_id":"..."}`; an unauthenticated `GET /v1/chat/completions` answered HTTP 404 with the plain-text body `404 page not found`, 2026-09-29. `errorRules` holds one rule, status `401` → authentication |
| Capabilities          | `text` and `streaming` come from the intro page's chat example with `stream=True`; `thinking` is `true` on the basis of the Codewhale integration page sentence quoted under Key Facts; `tools`, `structuredOutput` and `embeddings` are `false`; no combined tools+schema request was sent, so `structuredOutputWithTools` is `false`                                                                                                                          |
| Live capability sweep | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=modelscope` with a real key and record the result.                                                                                                                                                                                                                                       |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

Each row is a statement from a ModelScope page, quoted from the docs text
described at the top of this page.

| Situation                                 | What the vendor says                                                                                                                                                                                      | Page   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Newly registered account                  | "After account registration, you must bind your Alibaba Cloud account and complete real-name verification before using API-Inference."                                                                    | intro  |
| A model id is no longer served            | "Over time, as new models are launched, older models may be deprecated and no longer supported. To ensure your API calls work properly, please configure a currently supported model ID."                 | intro  |
| A model id is no longer served            | "As new models are released, older models may gradually be removed from API Inference."                                                                                                                   | limits |
| Reasoning models                          | "Please refer to the API-Inference sample code on the model page as the authoritative source", "especially for reasoning models, as their calling methods may have subtle differences from standard LLMs" | intro  |
| Concurrency or quota limits               | "The allowed concurrency for different models will be dynamically rate-limited according to platform load"                                                                                                | limits |
| Production traffic with concurrency needs | "Please do not use it for online tasks requiring high concurrency or SLA guarantees"                                                                                                                      | limits |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
