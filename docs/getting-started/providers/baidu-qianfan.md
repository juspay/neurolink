---
title: Baidu Qianfan Provider Guide
description: Baidu Qianfan on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `ernie-5.1`
keywords: baidu, qianfan, baidu-qianfan, ernie, openai-compatible, tier 2, provider setup, deepseek, glm, qwen
---

# Baidu Qianfan Provider Guide

Baidu Qianfan is a **Tier-2 catalog provider**: its integration is one JSON
file (`src/lib/providers/catalog/baidu-qianfan.json`) rather than hand-written
code. That file is the source of truth for everything on this page.

> **Verification status:** this entry is **docs-verified only, not yet
> live-verified.** An unauthenticated `GET https://qianfan.baidubce.com/v2/models`
> on 2026-09-29 answered HTTP 403, so the model ids come from Baidu's public
> docs and the roster has not been checked. No account was created and no API
> key was used to build this entry.
> `evidence.liveMatrix` is `null` until someone runs the live capability matrix
> with a real key (see [Verification status](#verification-status) below).

---

## Key Facts

- **Provider id**: `baidu-qianfan` (aliases `qianfan`, `baidu`)
- **Protocol**: OpenAI-compatible (`/chat/completions`). The
  [quickstart](https://cloud.baidu.com/doc/qianfan/s/rmh4stn9m) says
  "千帆ModelBuilder提供了与OpenAI兼容的使用方式，用户只需调整api_key、base_url、model等参数，就可以通过OpenAI SDK调用千帆ModelBuilder推理服务。"
  and the [Inference API V2 page](https://cloud.baidu.com/doc/qianfan/s/qmh4sv5vi)
  says the V2 model-service API is "完全兼容OpenAI标准（包含身份认证、接口协议）"
- **Base URL**: `https://qianfan.baidubce.com/v2`
- **Default model**: `ernie-5.1`
- **Models in catalog**: 12, taken from the vendor's
  [model-list page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j)
  (updated 2026-09-16, retrieved 2026-09-29)
- **Streaming**: supported — the
  [structured-outputs page](https://cloud.baidu.com/doc/qianfan-docs/s/6m8r1x5hz)
  shows an OpenAI SDK example with `stream=True` that iterates over the chunks
- **Tool calling**: `model-dependent` — the
  [function-calling page](https://cloud.baidu.com/doc/qianfan-docs/s/xm95lyys5)
  (updated 2026-07-09) documents an OpenAI-style `tools` parameter and lists
  `ernie-5.1` and `ernie-5.0` in its 支持模型范围 (supported models) section
- **Tools while streaming**: not declared (`false`) — the function-calling
  page's request examples send `"stream": false`
- **Structured output**: `true` on this entry — the
  [structured-outputs page](https://cloud.baidu.com/doc/qianfan-docs/s/6m8r1x5hz)
  (updated 2026-05-27) documents the `response_format` field with `text`,
  `json_object` and `json_schema`, has a `json_schema` object description
  containing "只有部分模型支持" (translation: only some models support it), and
  lists DeepSeek-V4-Pro and GLM-5.1, among others, in its 支持模型范围
  (supported models) section
- **Structured output + tools together**: not declared (`false`) — no combined
  probe was possible without credentials
- **Embeddings**: not declared on this catalog entry (`embeddings` is `false`).
  The model-list page has a 文本向量 (text embedding) section; this flag
  describes the NeuroLink entry, not the vendor's own API surface
- **Thinking**: not declared (`false`) — the
  [deep-thinking page](https://cloud.baidu.com/doc/qianfan-docs/s/Wm95lyynv)
  documents `thinking` and `enable_thinking` request parameters for the models
  it lists and a `reasoning_content` output field; this entry declares no
  thinking capability
- **Billing**: `free-tier` — see [Billing](#billing) below
- **Key format**: none declared (`apiKeyFormat` is `null`), so NeuroLink does
  not validate the key
- **Scheduled retirements**: the
  [model-retirement page](https://cloud.baidu.com/doc/qianfan/s/zmh4stou3)
  (updated 2026-09-24, retrieved 2026-09-29) has rows with 模型退役日期
  "2026-10-29" for ERNIE-5.0, ERNIE-4.5-Turbo-128K, ERNIE-4.5-Turbo-32K,
  ERNIE-4.5-Turbo-VL-128K and ERNIE-4.5-Turbo-VL-32K

---

## Quick Start

### 1. Get an API key

1. Visit: https://console.bce.baidu.com/qianfan/ (an unauthenticated GET on 2026-09-29 answered HTTP 200 with the page title 百度智能云千帆大模型平台; sign-in was not attempted while building this entry)
2. Create an API key: the API KEY page (https://cloud.baidu.com/doc/qianfan/s/wmh8l6tnf, updated 2026-04-14) says to log in to the 百度千帆 platform, click 系统管理 in the left navigation, open API Key, then click 创建 API Key and enter a name; the quickstart (https://cloud.baidu.com/doc/qianfan/s/rmh4stn9m) links 控制台-安全认证-API Key to https://console.bce.baidu.com/iam/#/iam/apikey/list
3. Authentication is HTTP Bearer: the quickstart (https://cloud.baidu.com/doc/qianfan/s/rmh4stn9m) says the Authorization request header must carry the API key with Bearer in front of it; NeuroLink does not validate the key format
4. Billing as the vendor states it: the new-user free-quota page (https://cloud.baidu.com/doc/qianfan/s/Imi2rpirg, updated 2025-11-17) says that after you visit the platform and agree to the user agreement the system activates it automatically and issues a new-user free token quota; its table has 17 rows under 服务名称, 赠送Tokens量 and 有效期, and the page says the quota applies to online inference calls of preset model services, not batch inference. The billing page (https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya, updated 2026-09-24) lists text-generation prices under "按量后付费" in 元/千tokens, for example "ERNIE 5.1" (版本名称 "ERNIE-5.1") with 在线推理 "0.004" for 子项 `输入（输入<=32k）` and "0.018" for 子项 `输出（输入<=32k）`
5. Set `BAIDU_QIANFAN_API_KEY` in your .env file

### 2. Configure

```bash
export BAIDU_QIANFAN_API_KEY=your-api-key
export BAIDU_QIANFAN_MODEL=ernie-5.1   # optional — overrides the default model
export BAIDU_QIANFAN_BASE_URL=https://qianfan.baidubce.com/v2   # optional — proxy or self-hosted gateway
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "baidu-qianfan",
  model: "ernie-5.1",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider baidu-qianfan
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "baidu-qianfan",
  credentials: { baiduQianfan: { apiKey: process.env.BAIDU_QIANFAN_API_KEY } },
});
```

---

## Billing

The [new-user free-quota page](https://cloud.baidu.com/doc/qianfan/s/Imi2rpirg)
(updated 2025-11-17) says that from 2025-10-24 00:00, after you visit the
platform and agree to the user agreement, the system activates Qianfan
automatically and issues a new-user free token quota. Its table has 17 rows,
and the 服务名称 column reads: ERNIE-4.5-Turbo-128K, ERNIE-4.5-Turbo-32K,
ERNIE-4.5-Turbo-VL, ERNIE-X1-Turbo-32K, DeepSeek-R1, DeepSeek-R1-250528,
DeepSeek-V3-250324, DeepSeek-V3.1-250821, DeepSeek-V3.1-Think-250821,
Kimi-K2-Instruct, Qwen3-235B-A22B-Instruct-2507,
Qwen3-30B-A3B-Instruct-2507, Qwen3-Coder-30B-A3B-Instruct,
Qwen3-Coder-480B-A35B-Instruct, bge-large-en, bge-large-zh and
qianfan-sug-8k. In rows 1 to 17 the 赠送Tokens量 cell reads "100万" and the
有效期 cell reads "3个月". The page says the quota applies to online inference
calls of preset model services, not batch inference. The entry records
`free-tier` from that page.

The [model-retirement page](https://cloud.baidu.com/doc/qianfan/s/zmh4stou3)
(updated 2026-09-24, retrieved 2026-09-29) has rows with 退役模型版本
"DeepSeek-V3.1-250821" (模型退役日期 "2026-06-30"), "Kimi-K2-Instruct"
(模型退役日期 "2026-03-26") and "ERNIE-4.5-Turbo-128K" (模型退役日期
"2026-10-29").

The [billing page](https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya) (updated
2026-09-24) lists text-generation prices under "按量后付费" in 元/千tokens
(yuan per thousand tokens). For example, its row with 模型名称 "ERNIE 5.1" and
版本名称 "ERNIE-5.1" has 在线推理 "0.004" for 子项 `输入（输入<=32k）`, "0.018"
for `输出（输入<=32k）`, "0.006" for `输入（32k<输入<=128k）` and "0.022" for
`输出（32k<输入<=128k）`. The catalog entry carries no `pricingPerMTok`; the
billing page states prices in 元/千tokens.

---

## Models

| Model                    | Context | Vision | Max output | Notes                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ernie-5.1` ⭐           | 128k    | no     | 65,536     | NeuroLink default. Listed under the "ERNIE系列-旗舰模型" heading; the "推荐模型" table cell begins "ERNIE 5.1是文心系列最新模型". Listed on the function-calling page.                                                                                                                             |
| `ernie-5.0`              | 128k    | yes    | 65,536     | Listed in the vendor's 视觉理解 (vision understanding) ERNIE table and on the function-calling page; described as "文心5.0是原生全模态大模型". The model-retirement page has a row with 退役模型版本 "ERNIE-5.0" and 模型退役日期 "2026-10-29".                                                    |
| `ernie-4.5-turbo-128k`   | 128k    | no     | not set    | Listed under the "ERNIE系列-旗舰模型" heading and in the "推荐模型" table; the page states max output as "16k" in one table and "[2，12288]" in another, so the entry leaves it unset. The model-retirement page has a row with 退役模型版本 "ERNIE-4.5-Turbo-128K" and 模型退役日期 "2026-10-29". |
| `ernie-4.5-turbo-32k`    | 32k     | no     | 12,288     | Listed under the "ERNIE系列-旗舰模型" heading. The model-retirement page has a row with 退役模型版本 "ERNIE-4.5-Turbo-32K" and 模型退役日期 "2026-10-29".                                                                                                                                          |
| `ernie-4.5-turbo-vl`     | 128k    | yes    | 16,384     | Listed in the vendor's 视觉理解 (vision understanding) ERNIE table; `models.visionModel`. The model-retirement page has a row with 退役模型版本 "ERNIE-4.5-Turbo-VL-128K" and 模型退役日期 "2026-10-29", and a row with 退役模型版本 "ERNIE-4.5-Turbo-VL-32K" and 模型退役日期 "2026-10-29".       |
| `deepseek-v4-pro`        | 1M      | no     | 393,216    | NeuroLink fallback. The "推荐模型" table cell begins "核心定位：超强通用旗舰大模型，Agent能力大幅提高。"; listed on the structured-outputs page and in the deep-thinking page's `thinking` list.                                                                                                   |
| `deepseek-v4-pro-0813`   | 1M      | no     | 393,216    | Listed in the DeepSeek tables of the text-generation and deep-thinking sections.                                                                                                                                                                                                                   |
| `deepseek-v4-flash-0731` | 1M      | no     | 393,216    | Listed in the DeepSeek tables of the text-generation and deep-thinking sections.                                                                                                                                                                                                                   |
| `glm-5.3`                | 1M      | no     | 131,072    | Listed under "其他" in the 深度思考 (deep thinking) section.                                                                                                                                                                                                                                       |
| `glm-5.2`                | 1M      | no     | 131,072    | Listed under "其他" in the 深度思考 (deep thinking) section.                                                                                                                                                                                                                                       |
| `glm-5.1`                | 198k    | no     | 131,072    | NeuroLink fallback. Listed under "其他" in the 深度思考 section, on the structured-outputs page and in the deep-thinking page's `thinking` list.                                                                                                                                                   |
| `qwen3.5-397b-a17b`      | 256k    | no     | 65,536     | NeuroLink fallback. Listed under "Qwen系列" in the 深度思考 (deep thinking) section.                                                                                                                                                                                                               |

The figures are read from the
[model-list page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) (updated
2026-09-16, retrieved 2026-09-29). The Context column shows the page's strings
("128k", "1M" and similar); the catalog's `contextWindow` values are
NeuroLink's numeric entries for them, converted with k = 1,000 and M =
1,000,000. Max output is the top of the range the page states, for example
"[1，65536]".
The deep-thinking section's note says "以下最大输出长度为包含思维链输出的总长度"
(translation: the max output lengths below are the total including
chain-of-thought output), which applies to the `glm-*` and `qwen3.5-*` rows.
Vision is `yes` for the models the page lists in its 视觉理解 (vision
understanding) section. The vision-understanding page
([docs](https://cloud.baidu.com/doc/qianfan-docs/s/fm8r1ndsm)) documents image
input as OpenAI-style `image_url` content parts.

`models.defaultContextWindow` (32,000) and `models.defaultMaxOutputTokens`
(4,096) are placeholders the vendor does not publish; they apply to a model id
that is not in the catalog. Each per-model `contextWindow` is a placeholder
too: NeuroLink's conversion of the page's "128k", "1M" style strings.

**Fallback order** when the default is unavailable:
`deepseek-v4-pro` → `glm-5.1` → `qwen3.5-397b-a17b`. The runtime fallback
model name the loader derives (`fallbacks[1]`) is `glm-5.1`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog currently records for Baidu Qianfan — **docs-verified only, not
live-verified**:

| Probe                     | Result                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                    | unauthenticated `GET https://qianfan.baidubce.com/v2/models`, HTTP 403, JSON body with code "AccessDenied" and message "Access denied.", 2026-09-29 — no key used, so the 12 model ids come from the model-list page and the roster has not been checked                                                                                                                            |
| Auth-failure shape        | unauthenticated `GET https://qianfan.baidubce.com/v2/chat/completions`, HTTP 401, JSON body with `error.code` "invalid_iam_token", 2026-09-29. The [error-code page](https://cloud.baidu.com/doc/qianfan/s/Qmh4su56e) (updated 2026-04-22) lists 错误码 "invalid_iam_token" as HTTP 401 with 错误信息 "IAM Certification failed" and rows of 类型 "rate_limit_exceeded" as HTTP 429 |
| Model retirements         | public [model-retirement page](https://cloud.baidu.com/doc/qianfan/s/zmh4stou3) (updated 2026-09-24), read 2026-09-29 — rows with 模型退役日期 "2026-10-29" for ERNIE-5.0, ERNIE-4.5-Turbo-128K, ERNIE-4.5-Turbo-32K, ERNIE-4.5-Turbo-VL-128K and ERNIE-4.5-Turbo-VL-32K                                                                                                            |
| Billing                   | public [free-quota page](https://cloud.baidu.com/doc/qianfan/s/Imi2rpirg) (updated 2025-11-17) states a new-user free token quota issued automatically after agreeing to the user agreement, 2026-09-29                                                                                                                                                                             |
| Tools / structured output | documented on the function-calling and structured-outputs pages respectively; neither was exercised live, and no combined tools+schema request was sent — `structuredOutputWithTools` stays `false`                                                                                                                                                                                 |
| Live capability sweep     | **not run.** `evidence.liveMatrix` is `null`. Before treating this provider as production-ready, run `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=baidu-qianfan` with a real key and record the result.                                                                                                                                                        |

Do not treat this entry as equivalent to a live-verified Tier-2 provider
(e.g. FriendliAI, Novita AI) until that live matrix has been run and
`evidence.liveMatrix` is filled in.

---

## Troubleshooting

| Symptom                                  | Cause                                                                                                                                                           | Fix                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| HTTP 401 with code `invalid_iam_token`   | The error-code page says the bearer token is invalid or expired, or the request's Authorization header did not add Bearer                                       | The quickstart says to put Bearer in front of the API key in the Authorization header; NeuroLink reads `BAIDU_QIANFAN_API_KEY` |
| HTTP 429 with 类型 `rate_limit_exceeded` | The error-code page lists 错误码 `rpm_rate_limit_exceeded` (错误信息 "Rate limit reached for RPM") and `tpm_rate_limit_exceeded` ("Rate limit reached for TPM") | The same page's 说明 for those rows includes "适当控制请求频率" (translation: control the request frequency appropriately)     |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
