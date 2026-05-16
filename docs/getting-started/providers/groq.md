---
title: Groq Provider Guide
description: Sub-100ms inference — Llama 3.3 / 3.1, Mixtral, Gemma, Whisper via Groq's LPU-accelerated cloud
keywords: groq, lpu, llama-3.3, mixtral, gemma, sub-100ms, low-latency, inference
---

# Groq Provider Guide

**Sub-100ms inference of open-weight models via Groq's LPU — best for
latency-sensitive applications**

---

## Overview

Groq operates custom Language Processing Units (LPUs) that achieve far
lower per-token latency than GPU-based inference. NeuroLink wraps
`api.groq.com/openai/v1` (OpenAI-compatible) so the same generate /
stream contract works for Llama 3.3 / 3.1, Mixtral, Gemma 2, and the
Llama 3.2 vision variants.

- **`llama-3.3-70b-versatile`** (default) — production-grade, 128K context
- **`llama-3.1-8b-instant`** — lowest latency tier
- **`llama-3.2-90b-vision-preview`**, **`llama-3.2-11b-vision-preview`** — multimodal
- **`gemma2-9b-it`** — Google's lightweight instruct model
- **`mixtral-8x7b-32768`** — Mistral MoE
- **`llama-guard-3-8b`** — safety classifier

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Default base URL**: `https://api.groq.com/openai/v1`
- **Default model**: `llama-3.3-70b-versatile`
- **Latency**: typically <100ms TTFT (time to first token)
- **Context window**: 128K tokens on modern Llamas; 32K on Mixtral; 8K on Gemma 2
- **Vision**: Yes — Llama 3.2 vision variants
- **Streaming**: Supported (with characteristically low TTFT)
- **Tool calling**: Supported
- **Reasoning trace**: Not exposed (use models that natively reason)

---

## Quick Start

### 1. Get an API Key

Sign up at [https://console.groq.com/](https://console.groq.com/) and
create an API key at
[https://console.groq.com/keys](https://console.groq.com/keys).

### 2. Configure Environment

```bash
# Required
GROQ_API_KEY=gsk_...

# Optional: override the default model (default: llama-3.3-70b-versatile)
GROQ_MODEL=llama-3.1-8b-instant

# Optional: override the base URL
# GROQ_BASE_URL=https://api.groq.com/openai/v1
```

### 3. Generate Your First Response

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "groq",
  input: { text: "What's the fastest way to compute Fibonacci numbers?" },
});

console.log(result.content);
```

---

## SDK Usage

### Basic Generation

```typescript
const result = await ai.generate({
  provider: "groq",
  input: { text: "Write a haiku about programming." },
});
```

### Lowest-Latency Tier

For chatbots / autocomplete where TTFT matters most:

```typescript
const result = await ai.generate({
  provider: "groq",
  model: "llama-3.1-8b-instant",
  input: { text: "What's 2+2?" },
});
```

### Vision Input

```typescript
import { readFileSync } from "node:fs";

const screenshot = readFileSync("./screenshot.png");
const result = await ai.generate({
  provider: "groq",
  model: "llama-3.2-90b-vision-preview",
  input: {
    text: "What's wrong with this UI?",
    images: [screenshot],
  },
});
```

### Streaming

Streaming through Groq is particularly responsive due to the LPU:

```typescript
const stream = await ai.stream({
  provider: "groq",
  input: { text: "Explain how B-trees work, step by step." },
});

for await (const chunk of stream.stream) {
  if ("content" in chunk) process.stdout.write(chunk.content);
}
```

### Tool Calling

```typescript
const result = await ai.generate({
  provider: "groq",
  input: { text: "What's the weather in San Francisco?" },
  tools: {
    getWeather: {
      description: "Get current weather",
      parameters: { location: { type: "string" } },
      execute: async ({ location }) => `72°F sunny in ${location}`,
    },
  },
});
```

For tool-heavy workflows, consider `llama3-groq-70b-8192-tool-use-preview` (a tool-tuned variant).

### Per-Call Credentials

```typescript
const result = await ai.generate({
  provider: "groq",
  input: { text: "..." },
  credentials: { groq: { apiKey: "user-key" } },
});
```

---

## CLI Usage

```bash
# Default model
pnpm run cli generate "Quick question" --provider groq

# Lowest latency
pnpm run cli generate "Hi" --provider groq --model llama-3.1-8b-instant

# Vision
pnpm run cli generate "Describe this" --provider groq \
  --model llama-3.2-90b-vision-preview --image ./pic.jpg

# Loop / chat
pnpm run cli loop --provider groq
```

---

## Provider Aliases

| Alias  | Example           |
| ------ | ----------------- |
| `groq` | `--provider groq` |

---

## Configuration Reference

| Environment Variable | Required | Default                          | Description   |
| -------------------- | -------- | -------------------------------- | ------------- |
| `GROQ_API_KEY`       | Yes      | —                                | Groq API key  |
| `GROQ_MODEL`         | No       | `llama-3.3-70b-versatile`        | Default model |
| `GROQ_BASE_URL`      | No       | `https://api.groq.com/openai/v1` | Base URL      |

---

## Feature Support Matrix

| Feature           | llama-3.3-70b | llama-3.1-8b-instant | llama-3.2-vision | mixtral-8x7b | gemma2-9b |
| ----------------- | ------------- | -------------------- | ---------------- | ------------ | --------- |
| Text generation   | Yes           | Yes                  | Yes              | Yes          | Yes       |
| Streaming         | Yes           | Yes                  | Yes              | Yes          | Yes       |
| Tool calling      | Yes           | Yes                  | Limited          | Yes          | Yes       |
| Structured output | Yes           | Yes                  | Limited          | Yes          | Yes       |
| Vision            | No            | No                   | Yes              | No           | No        |
| Embeddings        | No            | No                   | No               | No           | No        |
| Context window    | 128K          | 128K                 | 128K             | 32K          | 8K        |

---

## Troubleshooting

### "Invalid Groq API key"

```bash
echo $GROQ_API_KEY
export GROQ_API_KEY=gsk_...
```

Get / rotate at [https://console.groq.com/keys](https://console.groq.com/keys).

### "Groq rate limit exceeded"

Free-tier limits are tight (RPM and TPM). Implement exponential
backoff or upgrade at
[https://console.groq.com/settings/billing](https://console.groq.com/settings/billing).

### "Groq model 'X' was decommissioned"

Groq deprecates older models periodically. Pick a current model from
[https://console.groq.com/docs/models](https://console.groq.com/docs/models).

### "Whisper-large-v3 is in the model list — can I transcribe?"

The Whisper models on Groq are STT (speech-to-text), not chat models.
Use NeuroLink's STT path with `provider: "openai-stt"` or `"deepgram"`
for transcription — Groq's Whisper endpoint isn't exposed through the
LLM provider class today.

### Latency feels normal, not sub-100ms

TTFT depends on input prompt length and model size. For sub-100ms,
keep the prompt short (<200 tokens) and use `llama-3.1-8b-instant`.
Also: ensure your network round-trip to `api.groq.com` is low — test
from a region close to Groq's PoPs.

---

## See Also

- [xAI Grok Provider](/docs/getting-started/providers/xai) — sibling OpenAI-compat with Grok 3
- [DeepSeek Provider](/docs/getting-started/providers/deepseek) — sibling with reasoning models
- Together AI — sibling open-model gateway (no setup doc yet; see `src/lib/providers/togetherAi.ts`)
- [Adding a new LLM provider](/docs/provider-integration/15-adding-llm-provider) — internal reference

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
