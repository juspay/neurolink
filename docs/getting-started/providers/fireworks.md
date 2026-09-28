---
title: Fireworks AI Provider Guide
description: Fast open-model inference (Kimi, GPT-OSS, Qwen, GLM) via Fireworks AI
keywords: fireworks, kimi-k3, gpt-oss-120b, qwen3p8-max, glm-5p3, fast inference
---

# Fireworks AI Provider Guide

**Open-model inference tuned for low-latency production workloads**

---

## Overview

[Fireworks AI](https://fireworks.ai/) hosts Kimi, GPT-OSS, Qwen, GLM and
other open models with aggressive throughput optimizations.
NeuroLink talks to the OpenAI-compatible endpoint at `api.fireworks.ai`.

### Key Facts

- **Protocol**: OpenAI-compatible (`/inference/v1/chat/completions`)
- **Default base URL**: `https://api.fireworks.ai/inference/v1`
- **Default model**: `accounts/fireworks/models/kimi-k3` (vision-capable)
- **Streaming**: Yes
- **Tool calling**: Yes (model-dependent)

---

## Quick Start

### 1. Get an API Key

[https://fireworks.ai/account/api-keys](https://fireworks.ai/account/api-keys)

### 2. Configure Environment

```bash
FIREWORKS_API_KEY=fw_your-key
FIREWORKS_MODEL=accounts/fireworks/models/kimi-k3
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

| Model ID                                 | Vision | Notes                               |
| ---------------------------------------- | ------ | ----------------------------------- |
| `accounts/fireworks/models/kimi-k3`      | Yes    | Default — newest Moonshot flagship  |
| `accounts/fireworks/models/gpt-oss-120b` | No     | Text fallback (`fallbackModelName`) |
| `accounts/fireworks/models/qwen3p8-max`  | Yes    | Qwen flagship                       |
| `accounts/fireworks/models/glm-5p3`      | No     | Rejects image inputs                |

Fireworks lists models on `/models` that are not deployed for serverless
use, so the catalog only keeps ids that answered a real chat call.
`kimi-k2p6`, the default until September 2026, now returns 404
`not deployed` and is retired.

Browse: [https://fireworks.ai/models](https://fireworks.ai/models)

---

## CLI Usage

```bash
pnpm run cli generate "..." --provider fireworks
pnpm run cli generate "..." --provider fireworks --model accounts/fireworks/models/qwen3p8-max
```

---

## Provider Aliases

| Alias       | Example                |
| ----------- | ---------------------- |
| `fireworks` | `--provider fireworks` |

---

## Configuration Reference

| Environment Variable | Required | Default                                 |
| -------------------- | -------- | --------------------------------------- |
| `FIREWORKS_API_KEY`  | Yes      | —                                       |
| `FIREWORKS_MODEL`    | No       | `accounts/fireworks/models/kimi-k3`     |
| `FIREWORKS_BASE_URL` | No       | `https://api.fireworks.ai/inference/v1` |

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
