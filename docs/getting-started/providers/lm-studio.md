---
title: LM Studio Provider Guide
description: Run any GGUF model locally with LM Studio's built-in OpenAI-compatible server and connect it to NeuroLink with zero API key required
keywords: lm studio, local ai, gguf, local llm, offline, privacy, openai-compatible
---

# LM Studio Provider Guide

**Run any GGUF model privately on your own hardware — no cloud, no API key required**

---

## Overview

[LM Studio](https://lmstudio.ai) is a desktop application that lets you download and run thousands of GGUF-format models (Llama, Mistral, Qwen, Phi, Gemma, and many more) locally on macOS, Windows, or Linux. When you start LM Studio's built-in server it exposes an OpenAI-compatible API at `http://localhost:1234/v1`.

NeuroLink's `lm-studio` provider connects to this server and **automatically discovers the loaded model** by calling `/v1/models` at request time. You do not need to specify a model name unless you want to pin a specific one.

### Key Facts

- **Runs locally**: No data leaves your machine
- **No API key needed**: LM Studio's server accepts any key (NeuroLink sends a placeholder)
- **Auto-discovery**: Omit `model:` and NeuroLink fetches the currently loaded model from `/v1/models`
- **Default base URL**: `http://localhost:1234/v1`
- **Vision**: Depends on the loaded model (e.g., LLaVA, Qwen-VL, Llama 3.2 Vision variants support images)
- **Streaming**: Supported
- **Tool calling**: Depends on the loaded model

---

## Quick Start

### 1. Download and Start LM Studio

1. Download LM Studio from [https://lmstudio.ai](https://lmstudio.ai) for your platform.
2. Open the app and search for a model in the **Discover** tab (e.g., `Llama 3.2 3B Instruct`).
3. Click **Download** and wait for it to complete.
4. Go to the **Local Server** tab (icon that looks like `<->`).
5. Select the model you downloaded and click **Start Server**.

The server starts on `http://localhost:1234` by default.

### 2. Configure Environment (Optional)

No environment variables are required for a default setup. Optionally:

```bash
# Override the base URL if you run LM Studio on a non-default port or host
LM_STUDIO_BASE_URL=http://localhost:1234/v1

# Pin a specific model (default: auto-discover from /v1/models)
LM_STUDIO_MODEL=

# API key — only needed if you run LM Studio behind an auth-proxying reverse-proxy
LM_STUDIO_API_KEY=
```

### 3. Install NeuroLink

```bash
npm install @juspay/neurolink
# or
pnpm add @juspay/neurolink
```

### 4. Generate Your First Response

Auto-discovery: NeuroLink calls `/v1/models` and uses the first loaded model.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Omit `model:` entirely — NeuroLink discovers the loaded model automatically
const result = await ai.generate({
  provider: "lm-studio",
  input: { text: "Explain the concept of entropy in information theory." },
});

console.log(result.content);
```

---

## Model Auto-Discovery

When no `model` is specified (and `LM_STUDIO_MODEL` is empty), the provider calls `GET /v1/models` with a 5-second timeout. It picks the first model returned — whichever is currently loaded in LM Studio.

If discovery fails (server not running, no model loaded), the provider falls back to a `"local-model"` placeholder and logs a warning. The next call will re-attempt discovery, so there is no need to restart your Node process after starting LM Studio.

```typescript
// Auto-discover — best for interactive local development
const result = await ai.generate({
  provider: "lm-studio",
  input: { text: "Hello!" },
  // No `model:` field
});
```

To pin a specific model, pass it explicitly:

```typescript
const result = await ai.generate({
  provider: "lm-studio",
  model: "llama-3.2-3b-instruct", // must match the ID shown in LM Studio
  input: { text: "Hello!" },
});
```

---

## SDK Usage

### Basic Generation (Auto-Discover)

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "lm-studio",
  input: { text: "Write a haiku about type safety." },
});

console.log(result.content);
```

### Streaming

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const stream = await ai.stream({
  provider: "lm-studio",
  input: {
    text: "Explain monads in Haskell as if I am a TypeScript developer.",
  },
});

for await (const chunk of stream.stream) {
  process.stdout.write(chunk);
}
```

### Per-Call Base URL Override

Useful if you run LM Studio on a different machine on your local network, or on a non-default port.

```typescript
const result = await ai.generate({
  provider: "lm-studio",
  input: { text: "Hello from across the network!" },
  credentials: {
    lmStudio: {
      baseURL: "http://192.168.1.42:1234/v1",
    },
  },
});
```

If your LM Studio server is behind an auth-proxying reverse-proxy (rare), pass the key too:

```typescript
const result = await ai.generate({
  provider: "lm-studio",
  input: { text: "Hello" },
  credentials: {
    lmStudio: {
      baseURL: "https://lmstudio.internal.example.com/v1",
      apiKey: "bearer-token-for-proxy",
    },
  },
});
```

---

## CLI Usage

### Basic Commands

```bash
# Auto-discover the loaded model
pnpm run cli generate "What is quantum entanglement?" --provider lm-studio

# Use provider aliases
pnpm run cli generate "Hello" --provider lmstudio
pnpm run cli generate "Hello" --provider lms

# Pin a model explicitly
pnpm run cli generate "Summarise the SOLID principles" \
  --provider lm-studio \
  --model llama-3.2-3b-instruct

# Interactive loop (auto-discovers model on each request)
pnpm run cli loop --provider lm-studio

# Point at a non-default server address
LM_STUDIO_BASE_URL=http://192.168.1.42:1234/v1 \
  pnpm run cli generate "Hello from network" --provider lm-studio
```

---

## Provider Aliases

| Alias       | Example                |
| ----------- | ---------------------- |
| `lm-studio` | `--provider lm-studio` |
| `lmstudio`  | `--provider lmstudio`  |
| `lms`       | `--provider lms`       |

---

## Configuration Reference

| Environment Variable | Required | Default                    | Description                                                 |
| -------------------- | -------- | -------------------------- | ----------------------------------------------------------- |
| `LM_STUDIO_BASE_URL` | No       | `http://localhost:1234/v1` | Base URL of the LM Studio server                            |
| `LM_STUDIO_MODEL`    | No       | `""` (auto-discover)       | Specific model ID to use; leave blank for auto-discovery    |
| `LM_STUDIO_API_KEY`  | No       | `lm-studio` (placeholder)  | Auth token — only needed for reverse-proxy setups with auth |

---

## Feature Support

| Feature         | Supported       | Notes                                                  |
| --------------- | --------------- | ------------------------------------------------------ |
| Text generation | Yes             |                                                        |
| Streaming       | Yes             |                                                        |
| Tool calling    | Model-dependent | Requires a model that understands function-call syntax |
| Vision / images | Model-dependent | Load a vision model (e.g., LLaVA, Qwen-VL)             |
| Embeddings      | No              | Use OpenAI or another embeddings provider              |
| Auto-discovery  | Yes             | Fetches active model from `/v1/models` at request time |

---

## Troubleshooting

### "LM Studio server not reachable"

The server is not running or is on a different URL.

1. Open LM Studio and go to the **Local Server** tab.
2. Select a model and click **Start Server**.
3. Confirm the port shown (default: 1234) matches `LM_STUDIO_BASE_URL`.

```bash
# Test reachability
curl http://localhost:1234/v1/models
```

### "Load a model in the LM Studio app"

LM Studio's server returned an empty model list. Go to the **Local Server** tab, select a model from the dropdown, and click the load/start button.

### "LM Studio model X is not loaded"

You pinned a specific model ID (`LM_STUDIO_MODEL` or `model:` in SDK/CLI), but that model is not loaded in LM Studio. Either load the model in the app or leave the model field blank to use whatever is already loaded.

### "LM Studio request timed out"

Large models on CPU-only machines can be very slow. Try:

- A smaller quantised model (Q4 instead of Q8)
- A model with fewer parameters
- Increasing the timeout via NeuroLink's global timeout settings

### Tool calls not working

Not all models support tool/function calling format. Load a model that was fine-tuned for instruction following and tool use (e.g., Llama 3.1, Mistral 7B Instruct v0.3). Check the model's documentation on Hugging Face for capability flags.

---

## See Also

- [Implementation spec](/docs/provider-integration/04-lm-studio) — internal design details and auto-discovery mechanics
- [llama.cpp provider](/docs/getting-started/providers/llamacpp) — headless alternative using the `llama-server` binary directly
- [Ollama provider](/docs/getting-started/providers/ollama) — another popular local model runtime
- [OpenAI Compatible provider](/docs/getting-started/providers/openai-compatible) — generic provider for any OpenAI-compatible endpoint

---

**Need Help?** Join the [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
