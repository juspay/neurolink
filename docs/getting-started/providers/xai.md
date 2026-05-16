---
title: xAI Grok Provider Guide
description: Access Grok-3, Grok-3 Mini, Grok-2, and Grok-2 Vision through NeuroLink's OpenAI-compatible xAI provider
keywords: xai, grok, grok-3, grok-3-mini, grok-2-vision, elon, vision, chat-completions
---

# xAI Grok Provider Guide

**Text + vision generation with the Grok family through a single API**

---

## Overview

xAI hosts Elon Musk's Grok family of models behind an OpenAI-compatible
chat-completions endpoint. NeuroLink wraps `api.x.ai/v1` so the same
generate / stream contract used by every other provider works for Grok
without translation.

- **`grok-3`** — flagship; best for complex reasoning, math, coding
- **`grok-3-mini`** — faster + cheaper variant of Grok 3
- **`grok-2-latest`** — previous flagship; still supported
- **`grok-2-vision-latest`** — multimodal (text + images)
- **`grok-beta`** — pre-release / experimental access

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Default base URL**: `https://api.x.ai/v1`
- **Default model**: `grok-3`
- **Context window**: 131K tokens (32K on `grok-2-vision-latest`)
- **Vision**: Yes — `grok-2-vision-latest` accepts image inputs
- **Streaming**: Supported
- **Tool calling**: Supported
- **Reasoning trace**: Not exposed (use Grok-3 for natively-strong reasoning)

---

## Quick Start

### 1. Get an API Key

Sign up at [https://console.x.ai/](https://console.x.ai/) and create an
API key under **API Keys**.

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required
XAI_API_KEY=your-xai-api-key

# Optional: override the default model (default: grok-3)
XAI_MODEL=grok-3

# Optional: override the base URL (default: https://api.x.ai/v1)
# XAI_BASE_URL=https://api.x.ai/v1
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
  provider: "xai",
  input: { text: "Explain how transformers handle long-range dependencies." },
});

console.log(result.content);
```

---

## Supported Models

| Model ID               | Family        | Context | Vision | Notes                      |
| ---------------------- | ------------- | ------- | ------ | -------------------------- |
| `grok-3`               | Grok 3        | 131K    | No     | Default; best reasoning    |
| `grok-3-mini`          | Grok 3 Mini   | 131K    | No     | Faster + cheaper Grok 3    |
| `grok-2-latest`        | Grok 2        | 131K    | No     | Previous flagship          |
| `grok-2-vision-latest` | Grok 2 Vision | 32K     | Yes    | Multimodal text + image    |
| `grok-beta`            | Beta          | 131K    | No     | Pre-release / experimental |

Pass any model ID via `--model` (CLI) or `model:` (SDK).

---

## SDK Usage

### Basic Generation

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "xai",
  input: { text: "Write a TypeScript function to debounce an async function." },
});

console.log(result.content);
```

### Vision Input (Grok 2 Vision)

```typescript
import { readFileSync } from "node:fs";

const screenshot = readFileSync("./screenshot.png");
const result = await ai.generate({
  provider: "xai",
  model: "grok-2-vision-latest",
  input: {
    text: "What's wrong with this UI?",
    images: [screenshot],
  },
});
```

### Streaming

```typescript
const stream = await ai.stream({
  provider: "xai",
  input: { text: "Explain how B-trees work, step by step." },
});

for await (const chunk of stream.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

### Tool Calling

```typescript
const result = await ai.generate({
  provider: "xai",
  input: { text: "What's the weather in San Francisco?" },
  tools: {
    getWeather: {
      description: "Get current weather for a location",
      parameters: { location: { type: "string" } },
      execute: async ({ location }) => {
        return `72°F sunny in ${location}`;
      },
    },
  },
});
```

### Per-Call Credential Override

```typescript
const result = await ai.generate({
  provider: "xai",
  input: { text: "Hello" },
  credentials: {
    xai: { apiKey: "sk-user-specific-key" },
  },
});
```

---

## CLI Usage

### Basic Commands

```bash
# Generate with default model (grok-3)
pnpm run cli generate "Explain quantum computing" --provider xai

# Use an alias
pnpm run cli generate "Hello" --provider grok

# Use a specific model
pnpm run cli generate "Solve this proof" --provider xai --model grok-3

# Vision
pnpm run cli generate "Describe this image" --provider xai \
  --model grok-2-vision-latest --image ./screenshot.png

# Interactive loop
pnpm run cli loop --provider xai
```

---

## Provider Aliases

| Alias  | Example           |
| ------ | ----------------- |
| `xai`  | `--provider xai`  |
| `grok` | `--provider grok` |

---

## Configuration Reference

| Environment Variable | Required | Default               | Description                     |
| -------------------- | -------- | --------------------- | ------------------------------- |
| `XAI_API_KEY`        | Yes      | —                     | xAI API key                     |
| `XAI_MODEL`          | No       | `grok-3`              | Default model to use            |
| `XAI_BASE_URL`       | No       | `https://api.x.ai/v1` | Base URL (override for proxies) |

---

## Feature Support Matrix

| Feature           | grok-3 | grok-3-mini | grok-2-latest | grok-2-vision | grok-beta |
| ----------------- | ------ | ----------- | ------------- | ------------- | --------- |
| Text generation   | Yes    | Yes         | Yes           | Yes           | Yes       |
| Streaming         | Yes    | Yes         | Yes           | Yes           | Yes       |
| Tool calling      | Yes    | Yes         | Yes           | Yes           | Yes       |
| Structured output | Yes    | Yes         | Yes           | Yes           | Yes       |
| Vision / images   | No     | No          | No            | Yes           | No        |
| Embeddings        | No     | No          | No            | No            | No        |

---

## Troubleshooting

### "Invalid xAI API key"

The `XAI_API_KEY` is missing or incorrect.

```bash
echo $XAI_API_KEY
export XAI_API_KEY=sk-...
```

Get or rotate keys at [https://console.x.ai/](https://console.x.ai/).

### "xAI rate limit exceeded"

Too many requests in a short window. Implement exponential backoff or
reduce concurrency. Free-tier limits are tight; consider upgrading at
[https://console.x.ai/](https://console.x.ai/).

### "xAI account has insufficient quota"

Top up at [https://console.x.ai/](https://console.x.ai/).

### "Model not found"

Use one of the documented model IDs above. Custom fine-tunes are not
exposed through the public API at this time.

---

## See Also

- [Adding a new LLM provider](/docs/provider-integration/15-adding-llm-provider) — internal reference for the integration pattern this provider follows
- [DeepSeek Provider](/docs/getting-started/providers/deepseek) — sibling OpenAI-compat provider with reasoning models
- [Groq Provider](/docs/getting-started/providers/groq) — sibling OpenAI-compat provider with sub-100ms inference

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
