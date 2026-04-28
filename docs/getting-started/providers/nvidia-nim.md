---
title: NVIDIA NIM Provider Guide
description: Access hundreds of AI models including Llama 3.3, DeepSeek-R1, Mixtral, Phi-4, and vision models through NVIDIA's hosted NIM inference platform
keywords: nvidia nim, llama, deepseek, mixtral, phi-4, vision, reasoning, gpu inference
---

# NVIDIA NIM Provider Guide

**Hundreds of optimised AI models on NVIDIA's GPU-accelerated inference platform — or your own self-hosted NIM deployment**

---

## Overview

NVIDIA NIM (NVIDIA Inference Microservices) is a managed inference platform that hosts a large catalog of open-weight models — Meta Llama, DeepSeek, Mistral, Microsoft Phi, Google Gemma, and more — all GPU-optimised and served through an OpenAI-compatible API. You can also point NeuroLink at a self-hosted NIM cluster by overriding the base URL.

### Key Facts

- **Hosted base URL**: `https://integrate.api.nvidia.com/v1`
- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Vision**: Yes, on supported models (Llama 3.2 Vision, etc.)
- **Reasoning**: Yes, on Nemotron and DeepSeek-R1 variants
- **Streaming**: Supported
- **Tool calling**: Supported on most models
- **Self-hosting**: Override `NVIDIA_NIM_BASE_URL` to point at a private NIM cluster

### NIM-Specific Extras

NIM supports additional generation parameters beyond the standard OpenAI surface: `top_k`, `min_p`, `repetition_penalty`, `min_tokens`, and per-model `chat_template` overrides. The NeuroLink provider automatically passes these via the `providerOptions.openai.body` mechanism. If a model rejects an unsupported parameter with HTTP 400, the provider retries the request with that parameter stripped.

---

## Quick Start

### 1. Get an API Key

Sign up at [https://build.nvidia.com](https://build.nvidia.com) and create an API key under [API Keys](https://build.nvidia.com/settings/api-keys).

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required
NVIDIA_NIM_API_KEY=nvapi-...

# Optional: override the default model (default: meta/llama-3.3-70b-instruct)
NVIDIA_NIM_MODEL=meta/llama-3.3-70b-instruct

# Optional: self-hosted NIM base URL (default: https://integrate.api.nvidia.com/v1)
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1

# Optional: NIM-specific generation parameters
NVIDIA_NIM_TOP_K=40
NVIDIA_NIM_MIN_P=0.05
NVIDIA_NIM_REPETITION_PENALTY=1.1
NVIDIA_NIM_MIN_TOKENS=1
NVIDIA_NIM_CHAT_TEMPLATE=
```

### 3. Install NeuroLink

```bash
npm install @juspay/neurolink
# or
pnpm add @juspay/neurolink
```

### 4. Generate Your First Response

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "nvidia-nim",
  input: { text: "Explain gradient descent in simple terms." },
});

console.log(result.content);
```

---

## Supported Models

NIM hosts hundreds of models. NeuroLink ships with these popular models pre-enumerated:

### Meta Llama

| Model ID                             | Context | Vision | Reasoning |
| ------------------------------------ | ------- | ------ | --------- |
| `meta/llama-3.3-70b-instruct`        | 128K    | No     | No        |
| `meta/llama-3.1-405b-instruct`       | 128K    | No     | No        |
| `meta/llama-3.1-70b-instruct`        | 128K    | No     | No        |
| `meta/llama-3.2-90b-vision-instruct` | 128K    | Yes    | No        |
| `meta/llama-3.2-11b-vision-instruct` | 128K    | Yes    | No        |

### NVIDIA Nemotron (Reasoning)

| Model ID                                 | Context | Vision | Reasoning |
| ---------------------------------------- | ------- | ------ | --------- |
| `nvidia/llama-3.3-nemotron-super-49b-v1` | 128K    | No     | Yes       |
| `nvidia/llama-3.1-nemotron-nano-8b-v1`   | 128K    | No     | Yes       |
| `nvidia/llama-3.1-nemotron-70b-instruct` | 128K    | No     | Yes       |

### DeepSeek (Hosted on NIM)

| Model ID                                    | Context | Vision | Reasoning |
| ------------------------------------------- | ------- | ------ | --------- |
| `deepseek-ai/deepseek-r1`                   | 128K    | No     | Yes       |
| `deepseek-ai/deepseek-r1-distill-llama-70b` | 128K    | No     | Yes       |

### Other Models

| Model ID                                | Context | Notes            |
| --------------------------------------- | ------- | ---------------- |
| `mistralai/mixtral-8x22b-instruct-v0.1` | 64K     | Large MoE        |
| `mistralai/mixtral-8x7b-instruct-v0.1`  | 32K     | Efficient MoE    |
| `microsoft/phi-4`                       | 16K     | Compact, capable |
| `google/gemma-3-27b-it`                 | 128K    | Google Gemma     |

Browse the full catalog at [https://build.nvidia.com/models](https://build.nvidia.com/models). You can pass any model ID via `--model` or `model:` — NIM returns 404 for IDs that are not in the catalog.

---

## SDK Usage

### Basic Generation

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "nvidia-nim",
  input: { text: "Write a TypeScript utility to deep-clone a plain object." },
});

console.log(result.content);
```

### Using a Specific Model

```typescript
const result = await ai.generate({
  provider: "nvidia-nim",
  model: "mistralai/mixtral-8x22b-instruct-v0.1",
  input: { text: "Summarise the key ideas in the CAP theorem." },
});
```

### Reasoning with `thinkingLevel`

Reasoning-capable models (Nemotron, DeepSeek-R1) accept a `thinking` flag via NIM's `chat_template_kwargs`. Pass `thinkingLevel` to activate it:

```typescript
const result = await ai.generate({
  provider: "nvidia-nim",
  model: "nvidia/llama-3.3-nemotron-super-49b-v1",
  input: {
    text: "Derive the Euler-Lagrange equation from the principle of stationary action.",
  },
  thinkingLevel: "high",
});

console.log(result.content);
```

Levels: `minimal` (no thinking) | `low` | `medium` | `high`

If the model does not support `chat_template_kwargs.thinking`, the provider automatically retries without it.

### Streaming

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const stream = await ai.stream({
  provider: "nvidia-nim",
  model: "meta/llama-3.3-70b-instruct",
  input: {
    text: "Walk me through building a REST API with Hono and TypeScript.",
  },
});

for await (const chunk of stream.stream) {
  process.stdout.write(chunk);
}
```

### Per-Call Credential Override

```typescript
const result = await ai.generate({
  provider: "nvidia-nim",
  input: { text: "Hello" },
  credentials: {
    nvidiaNim: {
      apiKey: "nvapi-per-user-key",
    },
  },
});
```

For self-hosted NIM clusters, override the base URL per call:

```typescript
const result = await ai.generate({
  provider: "nvidia-nim",
  input: { text: "Hello from self-hosted NIM" },
  credentials: {
    nvidiaNim: {
      apiKey: "internal-token",
      baseURL: "https://nim.internal.example.com/v1",
    },
  },
});
```

---

## CLI Usage

### Basic Commands

```bash
# Generate with the default model
pnpm run cli generate "What is the transformer architecture?" --provider nvidia-nim

# Use provider aliases
pnpm run cli generate "Hello" --provider nim
pnpm run cli generate "Hello" --provider nvidia

# Specify a model
pnpm run cli generate "Explain reinforcement learning" \
  --provider nvidia-nim \
  --model mistralai/mixtral-8x22b-instruct-v0.1

# Reasoning model with thinking enabled
pnpm run cli generate "Solve: what is 17! mod 13?" \
  --provider nvidia-nim \
  --model deepseek-ai/deepseek-r1 \
  --thinking-level high

# Interactive loop
pnpm run cli loop --provider nvidia-nim
```

---

## Provider Aliases

| Alias        | Example                 |
| ------------ | ----------------------- |
| `nvidia-nim` | `--provider nvidia-nim` |
| `nvidia`     | `--provider nvidia`     |
| `nim`        | `--provider nim`        |

---

## Configuration Reference

| Environment Variable            | Required | Default                               | Description                                |
| ------------------------------- | -------- | ------------------------------------- | ------------------------------------------ |
| `NVIDIA_NIM_API_KEY`            | Yes      | —                                     | NVIDIA NIM API key (starts with `nvapi-`)  |
| `NVIDIA_NIM_MODEL`              | No       | `meta/llama-3.3-70b-instruct`         | Default model                              |
| `NVIDIA_NIM_BASE_URL`           | No       | `https://integrate.api.nvidia.com/v1` | Base URL (override for self-hosted NIM)    |
| `NVIDIA_NIM_TOP_K`              | No       | —                                     | Top-K sampling; `-1` to disable            |
| `NVIDIA_NIM_MIN_P`              | No       | —                                     | Minimum token probability; `0` to disable  |
| `NVIDIA_NIM_REPETITION_PENALTY` | No       | —                                     | Anti-repetition factor; `1` is neutral     |
| `NVIDIA_NIM_MIN_TOKENS`         | No       | —                                     | Minimum output length in tokens            |
| `NVIDIA_NIM_CHAT_TEMPLATE`      | No       | —                                     | Override the model's default chat template |

---

## Self-Hosted NIM

If you run NIM on your own GPU cluster, set `NVIDIA_NIM_BASE_URL` to point at your cluster. Authentication is still forwarded via `Authorization: Bearer`, so set `NVIDIA_NIM_API_KEY` to any non-empty value if your cluster does not require it (or to your actual cluster token if it does).

```bash
NVIDIA_NIM_API_KEY=internal-token
NVIDIA_NIM_BASE_URL=https://nim.cluster.example.com/v1
```

---

## Feature Support

| Feature         | Supported | Notes                                                 |
| --------------- | --------- | ----------------------------------------------------- |
| Text generation | Yes       |                                                       |
| Streaming       | Yes       |                                                       |
| Tool calling    | Yes       | Most models; depends on model support                 |
| Vision / images | Yes       | Model-dependent (Llama 3.2 Vision, etc.)              |
| Reasoning trace | Yes       | Nemotron and DeepSeek-R1 variants via `thinkingLevel` |
| Embeddings      | No        | Use OpenAI or Bedrock for embeddings                  |

---

## Troubleshooting

### "Invalid NVIDIA NIM API key"

The `NVIDIA_NIM_API_KEY` is missing, expired, or incorrect.

```bash
echo $NVIDIA_NIM_API_KEY
export NVIDIA_NIM_API_KEY=nvapi-...
```

Get or rotate keys at [https://build.nvidia.com/settings/api-keys](https://build.nvidia.com/settings/api-keys).

### "NVIDIA NIM rate limit exceeded"

Your account has hit its request-per-minute or token-per-day limit. Upgrade your account, reduce request frequency, or implement backoff. Check your current usage at [https://build.nvidia.com/usage](https://build.nvidia.com/usage).

### "NVIDIA NIM model not available"

The model ID is not in the NIM catalog, or your account tier does not have access.

```bash
# Browse the catalog
open https://build.nvidia.com/models
```

Use the exact model ID shown on the model's page (e.g., `meta/llama-3.3-70b-instruct`).

### "NVIDIA NIM quota exceeded"

Account-level token or compute quota reached. Check your NIM dashboard.

### HTTP 400 with `reasoning_budget` or `chat_template` in the error

The model does not support one of the NIM-specific extras. The provider automatically retries without the rejected parameter. If you see this error surfaced, it means the second attempt also failed — check the rest of the error message for the root cause.

### Thinking level has no visible effect

Not all models support `chat_template_kwargs.thinking`. If the model rejects the parameter, the provider retries the request without it and produces a normal (non-reasoning) response. Use a Nemotron or DeepSeek-R1 model for guaranteed reasoning support.

---

## See Also

- [Implementation spec](/docs/provider-integration/03-nvidia-nim) — internal wire-format details and NIM-specific extras
- [DeepSeek provider](/docs/getting-started/providers/deepseek) — if you only need DeepSeek-R1 via the official DeepSeek API
- [OpenAI Compatible provider](/docs/getting-started/providers/openai-compatible) — generic provider for any OpenAI-compatible endpoint

---

**Need Help?** Join the [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
