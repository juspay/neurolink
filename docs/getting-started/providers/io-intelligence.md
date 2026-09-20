---
title: io.net Intelligence Provider Guide
description: io.net Intelligence on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `meta-llama/Llama-3.3-70B-Instruct`
keywords: io-intelligence, io-net, openai-compatible, tier 2, provider setup
---

# io.net Intelligence Provider Guide

io.net Intelligence is a **Tier-2 catalog provider**: OpenAI-wire-compatible with no
behavioural quirks, so its entire integration is one JSON file
(`src/lib/providers/catalog/io-intelligence.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `io-intelligence` (aliases: `io-net`)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.intelligence.io.solutions/api/v1`
- **Default model**: `meta-llama/Llama-3.3-70B-Instruct`
- **Models in catalog**: 34
- **Streaming**: supported
- **Tool calling**: supported (native)
- **Structured output**: supported
- **Embeddings**: not supported
- **Billing**: free-tier

---

## Quick Start

### 1. Get an API key

1. Visit: https://ai.io.net/
2. Sign in or create an io.net account
3. Create an API key for your project in the console
4. Set `IO_INTELLIGENCE_API_KEY` in your .env file

### 2. Configure

```bash
export IO_INTELLIGENCE_API_KEY=your-api-key
export IO_INTELLIGENCE_MODEL=meta-llama/Llama-3.3-70B-Instruct      # optional — overrides the default model
export IO_INTELLIGENCE_BASE_URL=https://api.intelligence.io.solutions/api/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain context windows in one paragraph." },
  provider: "io-intelligence",
  model: "meta-llama/Llama-3.3-70B-Instruct",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider io-intelligence
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "io-intelligence",
  credentials: {
    ioIntelligence: { apiKey: process.env.IO_INTELLIGENCE_API_KEY },
  },
});
```

---

## Models

| Model                                                | Context | Vision | $/M in · out         | Notes                                               |
| ---------------------------------------------------- | ------- | ------ | -------------------- | --------------------------------------------------- |
| `zai-org/GLM-5.3-Flash`                              | 256K    | yes    | $0.147997 / $0.49399 | Z.ai: GLM 5.3 Flash                                 |
| `zai-org/GLM-5.3`                                    | 256K    | no     | $1.39 / $4.4         | Z.ai: GLM 5.3                                       |
| `Qwen/Qwen3.8-27B`                                   | 64K     | yes    | $0.39 / $2.99        | Qwen: Qwen3.8 27B                                   |
| `deepseek-ai/DeepSeek-V4-Flash-0731`                 | 256K    | no     | $0.196 / $0.534      | DeepSeek: DeepSeek V4 Flash 0731                    |
| `moonshotai/Kimi-K3`                                 | 1M      | yes    | $3.18 / $15.9        | MoonshotAI: Kimi K3                                 |
| `XiaomiMiMo/MiMo-V2.5`                               | 1M      | no     | $0.1934 / $0.6268    | Xiaomi: MiMo-V2.5                                   |
| `zai-org/GLM-5.2`                                    | 256K    | no     | $1.552 / $4.884      | Z.ai: GLM 5.2                                       |
| `moonshotai/Kimi-K2.7-Code`                          | 256K    | yes    | $1.026 / $4.53       | MoonshotAI: Kimi K2.7 Code                          |
| `Qwen/Qwen3.6-35B-A3B`                               | 256K    | yes    | $0.1872 / $1.24675   | Qwen: Qwen3.6 35B A3B                               |
| `Qwen/Qwen3.6-27B`                                   | 32K     | yes    | $0.399 / $3.19       | Qwen: Qwen3.6 27B                                   |
| `MiniMaxAI/MiniMax-M2.7`                             | 256K    | no     | $0.426 / $1.62       | MiniMaxAI: MiniMax M2.7                             |
| `deepseek-ai/DeepSeek-V4-Flash`                      | 32K     | no     | $0.199 / $0.512      | DeepSeek: DeepSeek V4 Flash                         |
| `deepseek-ai/DeepSeek-V4-Pro`                        | 1M      | no     | $1.618 / $3.288      | DeepSeek: DeepSeek V4 Pro                           |
| `moonshotai/Kimi-K2.6`                               | 256K    | yes    | $0.76744 / $3.43436  | MoonshotAI: Kimi K2.6                               |
| `zai-org/GLM-5.1`                                    | 198K    | no     | $1.29 / $4.22        | Z.ai: GLM 5.1                                       |
| `MiniMaxAI/MiniMax-M2.5`                             | 192K    | no     | $0.294 / $1.176      | MiniMaxAI/MiniMax-M2.5                              |
| `moonshotai/Kimi-K2.5`                               | 256K    | yes    | $0.5284 / $2.785     | MoonshotAI: Kimi K2.5                               |
| `zai-org/GLM-5`                                      | 198K    | no     | $0.85 / $2.774       | Z.ai: GLM 5                                         |
| `deepseek-ai/DeepSeek-V3.2`                          | 160K    | no     | $1.4301 / $2.4063    | DeepSeek: DeepSeek V3.2                             |
| `moonshotai/Kimi-K2-Thinking`                        | 256K    | no     | $0.6 / $2.5          | MoonshotAI: Kimi K2 Thinking                        |
| `zai-org/GLM-4.5-Air`                                | 128K    | no     | $0.165 / $0.975      | Z.ai: GLM-4.5-Air                                   |
| `google/gemma-4-26b-a4b-it`                          | 256K    | no     | $0.116 / $0.38       | Google: Gemma 4 26B A4B                             |
| `zai-org/GLM-4.7-Flash`                              | 195K    | no     | $0.062625 / $0.4     | Z.ai: GLM 4.7 Flash                                 |
| `zai-org/GLM-4.7`                                    | 198K    | no     | $0.88 / $2.37        | Z.ai: GLM 4.7                                       |
| `moonshotai/Kimi-K2-Instruct-0905`                   | 256K    | no     | $0.57 / $2.3         | MoonshotAI: Kimi K2 Instruct 0905                   |
| `openai/gpt-oss-120b`                                | 128K    | no     | $0.188 / $0.7        | OpenAI: gpt-oss-120b                                |
| `deepseek-ai/DeepSeek-R1-0528`                       | 125K    | no     | $0.56775 / $2.279    | DeepSeek: R1 0528                                   |
| `zai-org/GLM-4.6`                                    | 128K    | no     | $0.536 / $2.07       | Z.ai: GLM 4.6                                       |
| `Qwen/Qwen3-Next-80B-A3B-Instruct`                   | 256K    | no     | $0.1175 / $1.136     | Qwen: Qwen3 Next 80B A3B Instruct                   |
| `Intel/Qwen3-Coder-480B-A35B-Instruct-int4-mixed-ar` | 104K    | no     | $0.445 / $2.145      | Intel: Qwen3 Coder 480B A35B Instruct INT4 Mixed AR |
| `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`  | 420K    | yes    | $0.274 / $0.8992     | Meta-Llama: Llama 4 Maverick 17B 128E Instruct FP8  |
| `mistralai/Mistral-Nemo-Instruct-2407`               | 125K    | no     | $0.0635 / $0.09875   | Mistral: Mistral Nemo Instruct 2407                 |
| `openai/gpt-oss-20b`                                 | 63K     | no     | $0.067 / $0.24       | OpenAI: gpt-oss-20b                                 |
| `meta-llama/Llama-3.3-70B-Instruct` ⭐               | 125K    | no     | $0.6066 / $1.0386    | Meta: Llama 3.3 70B Instruct                        |

**Fallback order** when the default is unavailable: `meta-llama/Llama-3.3-70B-Instruct` → `openai/gpt-oss-20b` → `zai-org/GLM-4.5-Air`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for io.net Intelligence:

| Probe                 | Result                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | authenticated GET /v1/models, HTTP 200, 2026-09-03                                                                                                                                                                                        |
| Auth rejection        | HTTP 401, 2026-09-03                                                                                                                                                                                                                      |
| Live capability sweep | 2026-09-03 — SDK end-to-end via dist: generate, stream, tool call (nonce round-trip) and json_schema structured output all pass. Tools + schema: after a tool result the vendor answers finish_reason=tool_calls with no tool_calls and n |

---

## Troubleshooting

| Symptom                               | Cause                                    | Fix                                                               |
| ------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `Invalid io.net Intelligence API key` | `IO_INTELLIGENCE_API_KEY` unset or wrong | Check the key at https://ai.io.net/                               |
| Model not found                       | The roster changed since 2026-09-03      | Pick a current id; catalog providers retire models without notice |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider's JSON becomes a working integration
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
