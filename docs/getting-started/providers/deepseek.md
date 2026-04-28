---
title: DeepSeek Provider Guide
description: Access DeepSeek-V3 (chat) and DeepSeek-R1 (reasoning) through NeuroLink's OpenAI-compatible DeepSeek provider
keywords: deepseek, deepseek-chat, deepseek-reasoner, deepseek-r1, reasoning, chain-of-thought
---

# DeepSeek Provider Guide

**Text generation with DeepSeek-V3 (chat) and DeepSeek-R1 (reasoning) through a single API**

---

## Overview

DeepSeek is a Chinese AI research lab offering highly capable open-weight models via a hosted cloud API. NeuroLink wraps their OpenAI-compatible endpoint, giving you access to two model families:

- **`deepseek-chat`** — DeepSeek-V3, a 671B mixture-of-experts model optimised for everyday chat and code tasks. Supports tool calling and structured output.
- **`deepseek-reasoner`** — DeepSeek-R1, a reasoning model that performs extended chain-of-thought before producing an answer. The AI SDK surfaces the reasoning trace separately so you can inspect it.

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Default base URL**: `https://api.deepseek.com`
- **Context window**: 64K tokens (both models)
- **Vision**: Not supported — text-only
- **Streaming**: Supported
- **Tool calling**: Supported on `deepseek-chat`; limited on `deepseek-reasoner`
- **Reasoning trace**: `deepseek-reasoner` exposes `reasoning_content` (surfaced as `reasoning` parts in the AI SDK response)

---

## Quick Start

### 1. Get an API Key

Sign up at [https://platform.deepseek.com](https://platform.deepseek.com) and create an API key under **API Keys**.

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required
DEEPSEEK_API_KEY=sk-...

# Optional: override the default model (default: deepseek-chat)
DEEPSEEK_MODEL=deepseek-chat

# Optional: override the base URL (default: https://api.deepseek.com)
DEEPSEEK_BASE_URL=https://api.deepseek.com
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
  provider: "deepseek",
  input: {
    text: "Explain the difference between synchronous and asynchronous programming.",
  },
});

console.log(result.content);
```

---

## Supported Models

| Model ID            | Family      | Context | Tool Calling | Notes                                       |
| ------------------- | ----------- | ------- | ------------ | ------------------------------------------- |
| `deepseek-chat`     | DeepSeek-V3 | 64K     | Yes          | Default; best for chat and code tasks       |
| `deepseek-reasoner` | DeepSeek-R1 | 64K     | Limited      | Extended reasoning; exposes reasoning trace |

Pass any model ID via `--model` (CLI) or `model:` (SDK). Only these two models are officially hosted on `api.deepseek.com`.

---

## SDK Usage

### Basic Generation

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "deepseek",
  input: { text: "Write a TypeScript function to debounce an async function." },
});

console.log(result.content);
```

### Using the Reasoner Model

```typescript
const result = await ai.generate({
  provider: "deepseek",
  model: "deepseek-reasoner",
  input: { text: "Prove that the square root of 2 is irrational." },
});

// The reasoning trace is available separately from the final answer
console.log(result.content);
```

Note: `deepseek-reasoner` produces a longer response latency because it thinks before answering.

### Streaming

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const stream = await ai.stream({
  provider: "deepseek",
  input: { text: "Explain how B-trees work, step by step." },
});

for await (const chunk of stream.stream) {
  process.stdout.write(chunk);
}
```

### Per-Call Credential Override

Pass credentials at call time to override the instance-level or environment-variable defaults. Useful when routing requests for different users through separate DeepSeek accounts.

```typescript
const result = await ai.generate({
  provider: "deepseek",
  input: { text: "Hello, world!" },
  credentials: {
    deepseek: {
      apiKey: "sk-user-specific-key",
    },
  },
});
```

You can also override the base URL per call — useful when pointing at a self-hosted OpenAI-compatible proxy in front of DeepSeek:

```typescript
const result = await ai.generate({
  provider: "deepseek",
  input: { text: "Hello" },
  credentials: {
    deepseek: {
      apiKey: "sk-...",
      baseURL: "https://my-proxy.example.com/v1",
    },
  },
});
```

---

## CLI Usage

### Basic Commands

```bash
# Generate with default model (deepseek-chat)
pnpm run cli generate "What is the halting problem?" --provider deepseek

# Use an alias
pnpm run cli generate "Hello" --provider ds

# Use the reasoning model
pnpm run cli generate "Prove P != NP (attempt)" --provider deepseek --model deepseek-reasoner

# Interactive loop mode
pnpm run cli loop --provider deepseek
```

### Streaming via CLI

The CLI streams output by default when a TTY is attached. No extra flags are required.

```bash
pnpm run cli generate "Explain TCP/IP in detail" --provider deepseek --model deepseek-chat
```

---

## Provider Aliases

The DeepSeek provider can be referenced by any of the following names:

| Alias      | Example               |
| ---------- | --------------------- |
| `deepseek` | `--provider deepseek` |
| `ds`       | `--provider ds`       |

---

## Configuration Reference

| Environment Variable | Required | Default                    | Description                                 |
| -------------------- | -------- | -------------------------- | ------------------------------------------- |
| `DEEPSEEK_API_KEY`   | Yes      | —                          | DeepSeek API key (starts with `sk-`)        |
| `DEEPSEEK_MODEL`     | No       | `deepseek-chat`            | Default model to use                        |
| `DEEPSEEK_BASE_URL`  | No       | `https://api.deepseek.com` | Base URL for the API (override for proxies) |

---

## Feature Support Matrix

| Feature           | `deepseek-chat` | `deepseek-reasoner` |
| ----------------- | --------------- | ------------------- |
| Text generation   | Yes             | Yes                 |
| Streaming         | Yes             | Yes                 |
| Tool calling      | Yes             | Limited             |
| Structured output | Yes             | Limited             |
| Vision / images   | No              | No                  |
| Embeddings        | No              | No                  |
| Reasoning trace   | No              | Yes                 |

---

## Troubleshooting

### "Invalid DeepSeek API key"

The `DEEPSEEK_API_KEY` is missing or incorrect.

```bash
# Verify the variable is set
echo $DEEPSEEK_API_KEY

# Set it inline
export DEEPSEEK_API_KEY=sk-...
```

Get or rotate keys at [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys).

### "DeepSeek account has insufficient balance"

Your account credit is exhausted. Top up at [https://platform.deepseek.com/usage](https://platform.deepseek.com/usage).

### "DeepSeek rate limit exceeded"

Too many requests in a short window. Implement exponential backoff or reduce request concurrency. Rate limits are published in the [DeepSeek API docs](https://platform.deepseek.com/api-docs).

### "Model not found"

Only `deepseek-chat` and `deepseek-reasoner` are hosted on `api.deepseek.com`. Check the model name for typos.

### Slow responses on `deepseek-reasoner`

Expected. R1 performs extended chain-of-thought reasoning before producing its final answer, which adds latency proportional to reasoning complexity. Use `deepseek-chat` for latency-sensitive paths.

### Tool calls failing on `deepseek-reasoner`

DeepSeek documents limited tool support on R1. For tool-heavy workflows, use `deepseek-chat`.

---

## See Also

- [Implementation spec](/docs/provider-integration/02-deepseek) — internal wire-format details and design decisions
- [OpenAI Compatible provider](/docs/getting-started/providers/openai-compatible) — generic provider for any OpenAI-compatible endpoint
- [LiteLLM provider](/docs/getting-started/providers/litellm) — proxy-based multi-provider access

---

**Need Help?** Join the [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
