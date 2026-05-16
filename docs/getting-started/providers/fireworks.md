---
title: Fireworks AI Provider Guide
description: Fast open-model inference (Llama, DeepSeek, Mixtral, Qwen) via Fireworks AI
keywords: fireworks, llama, deepseek-v4, mixtral, fast inference
---

# Fireworks AI Provider Guide

**Open-model inference tuned for low-latency production workloads**

---

## Overview

[Fireworks AI](https://fireworks.ai/) hosts Llama, DeepSeek, Mixtral,
Qwen, and other open models with aggressive throughput optimizations.
NeuroLink talks to the OpenAI-compatible endpoint at `api.fireworks.ai`.

### Key Facts

- **Protocol**: OpenAI-compatible (`/inference/v1/chat/completions`)
- **Default base URL**: `https://api.fireworks.ai/inference/v1`
- **Default model**: `accounts/fireworks/models/llama-v3p3-70b-instruct`
- **Streaming**: Yes
- **Tool calling**: Yes (model-dependent)

---

## Quick Start

### 1. Get an API Key

[https://fireworks.ai/account/api-keys](https://fireworks.ai/account/api-keys)

### 2. Configure Environment

```bash
FIREWORKS_API_KEY=fw_your-key
FIREWORKS_MODEL=accounts/fireworks/models/llama-v3p3-70b-instruct
```

### 3. Generate

```typescript
import { NeuroLink } from "@juspay/neurolink";
const ai = new NeuroLink();
const result = await ai.generate({
  provider: "fireworks",
  input: { text: "Summarise the Raft consensus algorithm." },
});
console.log(result.content);
```

---

## Supported Models (sample)

| Model ID                                             | Notes     |
| ---------------------------------------------------- | --------- |
| `accounts/fireworks/models/llama-v3p3-70b-instruct`  | Default   |
| `accounts/fireworks/models/llama-v3p1-405b-instruct` | Flagship  |
| `accounts/fireworks/models/deepseek-r1`              | Reasoning |
| `accounts/fireworks/models/mixtral-8x22b-instruct`   | MoE       |

Browse: [https://fireworks.ai/models](https://fireworks.ai/models)

---

## CLI Usage

```bash
pnpm run cli generate "..." --provider fireworks
pnpm run cli generate "..." --provider fireworks --model accounts/fireworks/models/deepseek-r1
```

---

## Provider Aliases

| Alias       | Example                |
| ----------- | ---------------------- |
| `fireworks` | `--provider fireworks` |

---

## Configuration Reference

| Environment Variable | Required | Default                                             |
| -------------------- | -------- | --------------------------------------------------- |
| `FIREWORKS_API_KEY`  | Yes      | —                                                   |
| `FIREWORKS_MODEL`    | No       | `accounts/fireworks/models/llama-v3p3-70b-instruct` |
| `FIREWORKS_BASE_URL` | No       | `https://api.fireworks.ai/inference/v1`             |

---

## Troubleshooting

- **`Model not found, inaccessible, and/or not deployed`** — your account
  has not deployed the requested model. Check
  [https://fireworks.ai/models](https://fireworks.ai/models) and either
  deploy it or pick a serverless one.

---

## See Also

- [Together AI Provider](/docs/getting-started/providers/together-ai)
- [Groq Provider](/docs/getting-started/providers/groq)
