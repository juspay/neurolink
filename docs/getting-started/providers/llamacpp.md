---
title: llama.cpp Provider Guide
description: Connect NeuroLink to a llama-server process for fully offline, local GGUF model inference with zero cloud dependency
keywords: llama.cpp, llamacpp, llama-server, gguf, local llm, offline, cpu inference, privacy
---

# llama.cpp Provider Guide

**Fully offline GGUF inference — connect NeuroLink directly to a `llama-server` process**

---

## Overview

[llama.cpp](https://github.com/ggerganov/llama.cpp) is the canonical open-source C++ runtime for running GGUF quantised models on CPU (and GPU). When started with `llama-server`, it exposes an OpenAI-compatible HTTP API at `http://localhost:8080/v1` by default.

NeuroLink's `llamacpp` provider connects to this server and **automatically discovers the loaded model** by querying `/v1/models` at request time. Unlike LM Studio, `llama-server` loads exactly one model at startup — the model embedded in the path you supply via `-m`.

### Key Facts

- **Runs locally**: No data leaves your machine
- **No API key needed**: `llama-server` does not authenticate by default (NeuroLink sends a placeholder)
- **Single model per process**: `llama-server` loads one GGUF file at startup
- **Auto-discovery**: Omit `model:` and NeuroLink fetches the model ID from `/v1/models`
- **Default base URL**: `http://localhost:8080/v1`
- **Vision**: Depends on the loaded model (LLaVA-style multimodal models supported by llama-server)
- **Streaming**: Supported
- **Tool calling**: Depends on the loaded model; start `llama-server` with `--jinja` for best tool support

---

## Quick Start

### 1. Install and Build llama.cpp

```bash
# Clone the repo
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Build (CPU-only — works on any machine)
cmake -B build
cmake --build build --config Release -j $(nproc)

# The server binary is now at build/bin/llama-server
```

For GPU-accelerated builds, see the [llama.cpp build docs](https://github.com/ggerganov/llama.cpp/blob/master/docs/build.md).

### 2. Download a GGUF Model

```bash
# Example: download Llama 3.2 3B Instruct Q4 from Hugging Face
huggingface-cli download \
  bartowski/Llama-3.2-3B-Instruct-GGUF \
  Llama-3.2-3B-Instruct-Q4_K_M.gguf \
  --local-dir ./models
```

Or download directly from [https://huggingface.co/models](https://huggingface.co/models) — search for GGUF variants.

### 3. Start the Server

```bash
# Basic startup (CPU inference)
./build/bin/llama-server \
  -m ./models/Llama-3.2-3B-Instruct-Q4_K_M.gguf \
  --port 8080

# With tool/function calling support (recommended)
./build/bin/llama-server \
  -m ./models/Llama-3.2-3B-Instruct-Q4_K_M.gguf \
  --port 8080 \
  --jinja

# GPU-accelerated (N layers offloaded to GPU)
./build/bin/llama-server \
  -m ./models/Llama-3.2-3B-Instruct-Q4_K_M.gguf \
  --port 8080 \
  -ngl 99
```

The server prints `listening on http://127.0.0.1:8080` when ready.

### 4. Configure Environment (Optional)

No environment variables are required for a default setup:

```bash
# Override the base URL if using a non-default port or remote host
LLAMACPP_BASE_URL=http://localhost:8080/v1

# Pin a specific model name (default: auto-discover from /v1/models)
LLAMACPP_MODEL=

# API key — only needed if llama-server is behind an auth-proxying reverse-proxy
LLAMACPP_API_KEY=
```

### 5. Install NeuroLink

```bash
npm install @juspay/neurolink
# or
pnpm add @juspay/neurolink
```

### 6. Generate Your First Response

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Omit `model:` — NeuroLink discovers the loaded model automatically
const result = await ai.generate({
  provider: "llamacpp",
  input: { text: "Explain the difference between a stack and a heap." },
});

console.log(result.content);
```

---

## Model Auto-Discovery

When no `model` is specified (and `LLAMACPP_MODEL` is empty), the provider queries `GET /v1/models` with a 5-second timeout. The first model returned is used — which is whichever GGUF file the server was started with.

If discovery fails, the provider falls back to `"loaded-model"` as a placeholder and logs a warning. The next call re-attempts discovery, so you do not need to restart your application after starting `llama-server`.

```typescript
// Auto-discover
const result = await ai.generate({
  provider: "llamacpp",
  input: { text: "What is a closure in programming?" },
  // No `model:` field
});
```

To pin the model explicitly:

```typescript
const result = await ai.generate({
  provider: "llamacpp",
  model: "Llama-3.2-3B-Instruct-Q4_K_M", // match the ID from /v1/models
  input: { text: "What is a closure?" },
});
```

---

## SDK Usage

### Basic Generation (Auto-Discover)

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "llamacpp",
  input: {
    text: "Write a Rust function to compute the nth Fibonacci number iteratively.",
  },
});

console.log(result.content);
```

### Streaming

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const stream = await ai.stream({
  provider: "llamacpp",
  input: { text: "Explain how the Linux kernel schedules processes." },
});

for await (const chunk of stream.stream) {
  process.stdout.write(chunk);
}
```

### Per-Call Base URL Override

Useful when `llama-server` runs on a different machine on your local network or on a non-default port.

```typescript
const result = await ai.generate({
  provider: "llamacpp",
  input: { text: "Hello from the network!" },
  credentials: {
    llamacpp: {
      baseURL: "http://192.168.1.42:8080/v1",
    },
  },
});
```

If your `llama-server` is behind an auth-proxying reverse-proxy:

```typescript
const result = await ai.generate({
  provider: "llamacpp",
  input: { text: "Hello" },
  credentials: {
    llamacpp: {
      baseURL: "https://llama.internal.example.com/v1",
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
pnpm run cli generate "What is garbage collection?" --provider llamacpp

# Use provider aliases
pnpm run cli generate "Hello" --provider llama.cpp
pnpm run cli generate "Hello" --provider llama-cpp

# Pin a model explicitly
pnpm run cli generate "Describe merge sort" \
  --provider llamacpp \
  --model Llama-3.2-3B-Instruct-Q4_K_M

# Interactive loop (re-discovers model on each request)
pnpm run cli loop --provider llamacpp

# Connect to a server on a different host
LLAMACPP_BASE_URL=http://192.168.1.42:8080/v1 \
  pnpm run cli generate "Hello from network" --provider llamacpp
```

---

## Provider Aliases

| Alias       | Example                |
| ----------- | ---------------------- |
| `llamacpp`  | `--provider llamacpp`  |
| `llama.cpp` | `--provider llama.cpp` |
| `llama-cpp` | `--provider llama-cpp` |

---

## Configuration Reference

| Environment Variable | Required | Default                    | Description                                                        |
| -------------------- | -------- | -------------------------- | ------------------------------------------------------------------ |
| `LLAMACPP_BASE_URL`  | No       | `http://localhost:8080/v1` | Base URL of the llama-server                                       |
| `LLAMACPP_MODEL`     | No       | `""` (auto-discover)       | Specific model ID; leave blank for auto-discovery via `/v1/models` |
| `LLAMACPP_API_KEY`   | No       | `llamacpp` (placeholder)   | Auth token — only needed for reverse-proxy setups with auth        |

---

## Feature Support

| Feature         | Supported       | Notes                                                                  |
| --------------- | --------------- | ---------------------------------------------------------------------- |
| Text generation | Yes             |                                                                        |
| Streaming       | Yes             |                                                                        |
| Tool calling    | Model-dependent | Start `llama-server` with `--jinja` for function-call template support |
| Vision / images | Model-dependent | Load a multimodal GGUF (LLaVA-style)                                   |
| Embeddings      | No              | Use OpenAI or another embeddings provider                              |
| Auto-discovery  | Yes             | Queries `/v1/models` at request time; falls back gracefully            |

---

## llama-server Tips

### Context Window

Set a larger context window at startup with `-c`:

```bash
./build/bin/llama-server -m model.gguf -c 8192 --port 8080
```

### GPU Offloading

Use `-ngl N` to offload N transformer layers to GPU (requires a CUDA or Metal build):

```bash
./build/bin/llama-server -m model.gguf -ngl 99 --port 8080
```

### Multiple CPU Threads

```bash
./build/bin/llama-server -m model.gguf -t 8 --port 8080
```

### Tool / Function Calling

Start with `--jinja` to enable Jinja-based chat template processing, which is required for function calling on most models:

```bash
./build/bin/llama-server -m model.gguf --jinja --port 8080
```

---

## Troubleshooting

### "llama.cpp server not reachable"

`llama-server` is not running or is on a different address.

```bash
# Test reachability
curl http://localhost:8080/v1/models

# Start the server
./build/bin/llama-server -m ./models/your-model.gguf --port 8080
```

### "llama.cpp request timed out"

CPU inference can be slow, especially for large models or long prompts. Reduce the model size (use a smaller Q4 quantisation), increase GPU offloading, or raise the NeuroLink timeout setting.

### HTTP 400 — model does not support tools

Tool calling requires the model to understand function-call syntax. Restart `llama-server` with `--jinja` and use a model fine-tuned for instruction following (e.g., Llama 3.1/3.2 Instruct).

```bash
# With Jinja for tool support
./build/bin/llama-server -m model.gguf --jinja --port 8080
```

### Auto-discovery keeps returning "loaded-model"

`llama-server` is running but `/v1/models` returned an empty list, or the server is not reachable. Confirm the server started successfully:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/v1/models
```

### Server crashes or runs out of memory

Your model is too large for available RAM. Use a more aggressively quantised variant (Q2 or Q4) or a smaller model. You can also limit the batch size at startup with `-b 512`.

---

## See Also

- [Implementation spec](/docs/provider-integration/05-llamacpp) — internal design details and auto-discovery mechanics
- [LM Studio provider](/docs/getting-started/providers/lm-studio) — GUI-based alternative with the same auto-discovery pattern
- [Ollama provider](/docs/getting-started/providers/ollama) — another popular local model runtime with a model management layer
- [OpenAI Compatible provider](/docs/getting-started/providers/openai-compatible) — generic provider for any OpenAI-compatible endpoint

---

**Need Help?** Join the [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
