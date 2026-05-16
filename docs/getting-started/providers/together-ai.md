---
title: Together AI Provider Guide
description: Use Together AI's open-model gateway (Llama, Qwen, DeepSeek, Mixtral) through NeuroLink
keywords: together-ai, llama, qwen, deepseek, mixtral, open-source
---

# Together AI Provider Guide

**Open-source LLMs at production scale via the Together gateway**

---

## Overview

[Together AI](https://together.ai/) hosts a large catalog of open-weight
models — Llama 3.x, Qwen, DeepSeek, Mixtral, Gemma — behind an
OpenAI-compatible chat-completions endpoint. NeuroLink wraps it with no
translation cost.

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Default base URL**: `https://api.together.xyz/v1`
- **Default model**: `meta-llama/Llama-3.3-70B-Instruct-Turbo`
- **Vision**: Yes — Llama 3.2 Vision variants
- **Streaming**: Supported
- **Tool calling**: Supported on Llama 3.1+ and DeepSeek

---

## Quick Start

### 1. Get an API Key

[https://api.together.xyz/settings/api-keys](https://api.together.xyz/settings/api-keys)

### 2. Configure Environment

```bash
TOGETHER_API_KEY=tgp_your-key
TOGETHER_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
```

### 3. Generate

```typescript
import { NeuroLink } from "@juspay/neurolink";
const ai = new NeuroLink();
const result = await ai.generate({
  provider: "together",
  input: { text: "Write a haiku about RAG pipelines." },
});
console.log(result.content);
```

---

## Supported Models (sample)

| Model ID                                        | Notes                       |
| ----------------------------------------------- | --------------------------- |
| `meta-llama/Llama-3.3-70B-Instruct-Turbo`       | Default; production quality |
| `meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo` | Flagship size               |
| `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo`  | Mid-tier                    |
| `deepseek-ai/DeepSeek-R1`                       | Reasoning model             |
| `Qwen/Qwen2.5-72B-Instruct-Turbo`               | Qwen 2.5 flagship           |

Browse the full catalog: [https://docs.together.ai/docs/serverless-models](https://docs.together.ai/docs/serverless-models)

---

## CLI Usage

```bash
pnpm run cli generate "Explain MoE routing" --provider together
pnpm run cli generate "..." --provider together --model deepseek-ai/DeepSeek-R1
```

---

## Provider Aliases

| Alias         | Example                  |
| ------------- | ------------------------ |
| `together`    | `--provider together`    |
| `together_ai` | `--provider together_ai` |

---

## Configuration Reference

| Environment Variable | Required | Default                                   |
| -------------------- | -------- | ----------------------------------------- |
| `TOGETHER_API_KEY`   | Yes      | —                                         |
| `TOGETHER_MODEL`     | No       | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| `TOGETHER_BASE_URL`  | No       | `https://api.together.xyz/v1`             |

---

## Feature Support Matrix

| Feature           | Support           |
| ----------------- | ----------------- |
| Text generation   | Yes               |
| Streaming         | Yes               |
| Tool calling      | Yes (model-dep.)  |
| Structured output | Yes (model-dep.)  |
| Vision            | Yes (Llama 3.2 V) |
| Embeddings        | Limited           |

---

## See Also

- [Fireworks Provider](/docs/getting-started/providers/fireworks)
- [Groq Provider](/docs/getting-started/providers/groq)
