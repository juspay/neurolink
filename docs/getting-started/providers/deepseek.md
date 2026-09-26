---
title: DeepSeek Provider Guide
description: Access DeepSeek-V4.1-Flash and DeepSeek-V4-Pro through NeuroLink's OpenAI-compatible DeepSeek provider
keywords: deepseek, deepseek-flash, deepseek-v4-pro, deepseek-chat, deepseek-reasoner, reasoning, chain-of-thought
---

# DeepSeek Provider Guide

**Text and image input with DeepSeek-V4.1-Flash and DeepSeek-V4-Pro through a single API**

---

## Overview

DeepSeek is a Chinese AI research lab offering highly capable open-weight models via a hosted cloud API. NeuroLink wraps their OpenAI-compatible endpoint. The API serves two models:

- **`deepseek-flash`** — DeepSeek-V4.1-Flash. Reads images as well as text.
- **`deepseek-v4-pro`** — DeepSeek-V4-Pro-0813. Text only.

The older ids still work as aliases of `deepseek-flash`: **`deepseek-chat`** answers with thinking off, and **`deepseek-reasoner`** answers with thinking on and returns a reasoning trace.

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Default base URL**: `https://api.deepseek.com`
- **Context window**: 1M tokens (1,048,576), with up to 384K (393,216) output tokens
- **Vision**: `deepseek-flash` and its aliases; not `deepseek-v4-pro'
- **Streaming**: Supported
- **Tool calling**: Supported. Tools and JSON output work in the same request.
- **Reasoning trace**: returned as `reasoning_content` when thinking is on (`deepseek-reasoner`)

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

| Model ID            | Serves              | Context | Images | Notes                                            |
| ------------------- | ------------------- | ------- | ------ | ------------------------------------------------ |
| `deepseek-chat`     | DeepSeek-V4.1-Flash | 1M      | Yes    | Default; alias of `deepseek-flash`, thinking off |
| `deepseek-reasoner` | DeepSeek-V4.1-Flash | 1M      | Yes    | Alias of `deepseek-flash`, thinking on           |
| `deepseek-flash`    | DeepSeek-V4.1-Flash | 1M      | Yes    | Thinking on by default                           |
| `deepseek-v4-pro`   | DeepSeek-V4-Pro     | 1M      | No     | Thinking on by default                           |

Pass any model ID via `--model` (CLI) or `model:` (SDK). `GET /models` on `api.deepseek.com` lists only `deepseek-flash` and `deepseek-v4-pro`; the two older ids are accepted as aliases.

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

Note: with thinking on, responses take longer because the model reasons before answering.

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

| Feature           | `deepseek-chat` | `deepseek-reasoner` | `deepseek-flash` | `deepseek-v4-pro` |
| ----------------- | --------------- | ------------------- | ---------------- | ----------------- |
| Text generation   | Yes             | Yes                 | Yes              | Yes               |
| Streaming         | Yes             | Yes                 | Yes              | Yes               |
| Tool calling      | Yes             | See below           | See below        | See below         |
| Structured output | Yes             | Not tested          | Not tested       | Not tested        |
| Vision / images   | Yes             | Yes                 | Yes              | No                |
| Embeddings        | No              | No                  | No               | No                |
| Reasoning trace   | No              | Yes                 | Yes              | Yes               |

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

DeepSeek answers an unknown id with `400` and "The supported API model names are deepseek-flash, deepseek-v4-pro". Use one of those, or the `deepseek-chat` / `deepseek-reasoner` aliases.

### Slow responses with thinking on

Expected. `deepseek-reasoner`, `deepseek-flash` and `deepseek-v4-pro` reason before answering, which adds latency. Use `deepseek-chat` for latency-sensitive paths.

### Tool calls failing with thinking on

DeepSeek's [thinking mode guide](https://api-docs.deepseek.com/guides/thinking_mode) says each turn's `reasoning_content` must be sent back on every later request once tools are in play, and that the API returns `400` otherwise. NeuroLink does this for you: the DeepSeek catalog entry sets `quirks.replayReasoningContent`, so both `generate()` and `stream()` send the reasoning back on each follow-up request. (Tested live on 2026-09-26, the API accepted follow-ups with or without it, but NeuroLink follows the documented contract.)

If a tool loop still fails, check whether you are replaying conversation history yourself without each assistant turn's reasoning. For tool-heavy workflows where you don't need the reasoning, `deepseek-chat` keeps thinking off.

---

## See Also

- [Implementation spec](/docs/provider-integration/02-deepseek) — internal wire-format details and design decisions
- [OpenAI Compatible provider](/docs/getting-started/providers/openai-compatible) — generic provider for any OpenAI-compatible endpoint
- [LiteLLM provider](/docs/getting-started/providers/litellm) — proxy-based multi-provider access

---

**Need Help?** Join the [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
