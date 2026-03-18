---
title: Ollama Provider Guide
description: Run AI models locally with Ollama - no API key required, full privacy, offline capable
keywords: ollama, local, llama, mistral, codellama, qwen, deepseek, phi, gemma, private, offline
---

# Ollama Provider Guide

**Run AI models locally with full privacy - no API key or cloud service required**

---

## Overview

Ollama lets you run open-source large language models entirely on your own machine. NeuroLink integrates with Ollama through a custom `OllamaLanguageModel` implementation that supports both the native Ollama API (`/api/generate`) and an OpenAI-compatible mode (`/v1/chat/completions`).

### Key Benefits

- **100% Local**: All inference runs on your hardware, no data leaves your machine
- **No API Key Required**: No accounts, billing, or rate limits
- **Offline Capable**: Works completely without internet after models are pulled
- **70+ Models**: Llama, Mistral, Qwen, DeepSeek, Gemma, Phi, CodeLlama, and more
- **Tool/Function Calling**: Multi-step tool execution via the OpenAI-compatible endpoint
- **Streaming**: Full streaming support in both native and OpenAI-compatible modes
- **Multimodal**: Image input support for vision-capable models (LLaVA, Llama 3.2)
- **Proxy-Aware**: Supports HTTP/HTTPS proxy configuration

### API Modes

| Mode                  | Endpoint               | Use Case                                          |
| --------------------- | ---------------------- | ------------------------------------------------- |
| **Native** (default)  | `/api/generate`        | Standard text generation and streaming            |
| **OpenAI-compatible** | `/v1/chat/completions` | Tool calling, chat-format messages, compatibility |

Tool calling always uses the OpenAI-compatible endpoint regardless of the mode setting.

---

## Quick Start

### 1. Install Ollama

=== "macOS (Homebrew)"

    ```bash
    brew install ollama
    ```

=== "macOS (Direct Download)"

    Download from [ollama.ai](https://ollama.ai), open the `.dmg`, and drag Ollama to Applications.

=== "Linux"

    ```bash
    curl -fsSL https://ollama.ai/install.sh | sh
    ```

=== "Windows"

    Download the installer from [ollama.ai](https://ollama.ai) and run it. WSL2 is also supported.

### 2. Start Ollama and Pull a Model

```bash
# Start the Ollama service (may auto-start on install)
ollama serve

# Pull the default model
ollama pull llama3.2:latest

# Verify installation
ollama list
```

### 3. Configure NeuroLink

Add to your `.env` file:

```bash
# Optional: All values below show defaults. Ollama works with zero configuration.

# Override the default model
OLLAMA_MODEL=llama3.2:latest

# Override the base URL (default: http://localhost:11434)
OLLAMA_BASE_URL=http://localhost:11434
```

### 4. Test the Setup

=== "SDK Usage"

    ```typescript
    import { NeuroLink } from "@juspay/neurolink";

    const ai = new NeuroLink();

    const result = await ai.generate({
      input: { text: "Explain quantum computing in simple terms" },
      provider: "ollama",
    });

    console.log(result.content);
    ```

=== "CLI Usage"

    ```bash
    # Quick generation
    pnpm run cli -- generate "Hello from local AI!" \
      --provider ollama

    # Use a specific model
    pnpm run cli -- generate "Write a haiku about AI" \
      --provider ollama \
      --model "mistral:latest"

    # Interactive loop mode
    pnpm run cli -- loop \
      --provider ollama \
      --model "llama3.1:8b"
    ```

---

## Supported Models

### Available Models (from `OllamaModels` enum)

Any model in the [Ollama library](https://ollama.ai/library) can be used by passing its tag to `--model`. The `OllamaModels` enum in `src/lib/constants/enums.ts` provides named constants for common models:

#### Llama Series

| Enum Key          | Model ID          | Description                              |
| ----------------- | ----------------- | ---------------------------------------- |
| `LLAMA4_SCOUT`    | `llama4:scout`    | Llama 4 multimodal with vision and tools |
| `LLAMA4_MAVERICK` | `llama4:maverick` | Llama 4 multimodal with vision and tools |
| `LLAMA3_3_70B`    | `llama3.3:70b`    | High-performance 70B                     |
| `LLAMA3_2_LATEST` | `llama3.2:latest` | Optimized for edge deployment (default)  |
| `LLAMA3_2_3B`     | `llama3.2:3b`     | Compact 3B edge model                    |
| `LLAMA3_2_1B`     | `llama3.2:1b`     | Ultra-compact 1B model                   |
| `LLAMA3_1_8B`     | `llama3.1:8b`     | Open model rivaling proprietary models   |
| `LLAMA3_1_70B`    | `llama3.1:70b`    | Large-scale open model                   |
| `LLAMA3_1_405B`   | `llama3.1:405b`   | Largest open Llama model                 |

#### Qwen Series

| Enum Key      | Model ID      | Description                      |
| ------------- | ------------- | -------------------------------- |
| `QWEN3_4B`    | `qwen3:4b`    | Advanced reasoning, multilingual |
| `QWEN3_8B`    | `qwen3:8b`    | Advanced reasoning, multilingual |
| `QWEN3_14B`   | `qwen3:14b`   | Advanced reasoning, multilingual |
| `QWEN3_32B`   | `qwen3:32b`   | Advanced reasoning, multilingual |
| `QWEN3_72B`   | `qwen3:72b`   | Advanced reasoning, multilingual |
| `QWQ_32B`     | `qwq:32b`     | Reasoning-specialized model      |
| `QWEN2_5_72B` | `qwen2.5:72b` | Enhanced coding and mathematics  |

#### DeepSeek Series

| Enum Key             | Model ID             | Description                |
| -------------------- | -------------------- | -------------------------- |
| `DEEPSEEK_R1_7B`     | `deepseek-r1:7b`     | State-of-the-art reasoning |
| `DEEPSEEK_R1_14B`    | `deepseek-r1:14b`    | Reasoning at 14B scale     |
| `DEEPSEEK_R1_32B`    | `deepseek-r1:32b`    | Reasoning at 32B scale     |
| `DEEPSEEK_R1_70B`    | `deepseek-r1:70b`    | Large-scale reasoning      |
| `DEEPSEEK_V3_LATEST` | `deepseek-v3:latest` | Mixture of Experts model   |

#### Mistral Series

| Enum Key               | Model ID               | Description                  |
| ---------------------- | ---------------------- | ---------------------------- |
| `MISTRAL_LATEST`       | `mistral:latest`       | Efficient general-purpose 7B |
| `MISTRAL_SMALL_LATEST` | `mistral-small:latest` | Compact Mistral variant      |
| `MISTRAL_NEMO_LATEST`  | `mistral-nemo:latest`  | Nemo architecture            |
| `MISTRAL_LARGE_LATEST` | `mistral-large:latest` | Largest Mistral model        |

#### Code-Specialized Models

| Enum Key            | Model ID            | Description               |
| ------------------- | ------------------- | ------------------------- |
| `CODELLAMA_7B`      | `codellama:7b`      | Code-focused Llama 7B     |
| `CODELLAMA_13B`     | `codellama:13b`     | Code-focused Llama 13B    |
| `CODELLAMA_34B`     | `codellama:34b`     | Code-focused Llama 34B    |
| `CODELLAMA_70B`     | `codellama:70b`     | Code-focused Llama 70B    |
| `QWEN2_5_CODER_7B`  | `qwen2.5-coder:7b`  | Qwen coding model         |
| `QWEN2_5_CODER_32B` | `qwen2.5-coder:32b` | Qwen coding model (large) |
| `STARCODER2_3B`     | `starcoder2:3b`     | Compact code generation   |
| `STARCODER2_15B`    | `starcoder2:15b`    | Larger code generation    |

#### Vision-Language Models

| Enum Key          | Model ID          | Description                 |
| ----------------- | ----------------- | --------------------------- |
| `LLAVA_7B`        | `llava:7b`        | Vision-language 7B          |
| `LLAVA_13B`       | `llava:13b`       | Vision-language 13B         |
| `LLAVA_34B`       | `llava:34b`       | Vision-language 34B         |
| `LLAVA_LLAMA3_8B` | `llava-llama3:8b` | LLaVA with Llama 3 backbone |

#### Other Notable Models

| Enum Key                 | Model ID                 | Description                   |
| ------------------------ | ------------------------ | ----------------------------- |
| `GEMMA3_LATEST`          | `gemma3:latest`          | Google Gemma 3                |
| `GEMMA2_27B`             | `gemma2:27b`             | Google Gemma 2 large          |
| `PHI4_LATEST`            | `phi4:latest`            | Microsoft Phi 4               |
| `PHI3_MINI`              | `phi3:mini`              | Microsoft Phi 3 compact       |
| `MIXTRAL_8X7B`           | `mixtral:8x7b`           | Mixture of Experts            |
| `MIXTRAL_8X22B`          | `mixtral:8x22b`          | Large Mixture of Experts      |
| `COMMAND_R_PLUS`         | `command-r-plus:104b`    | Cohere enterprise model       |
| `GLM_5_LATEST`           | `glm-5:latest`           | Z.AI flagship reasoning       |
| `NEMOTRON_3_NANO_LATEST` | `nemotron-3-nano:latest` | NVIDIA hybrid MoE, 1M context |

### Default Model

The default model is `llama3.2:latest` (set via `OllamaModels.LLAMA3_2_LATEST` in the provider registry). The internal `OllamaLanguageModel` uses `llama3.1:8b` as its default with `llama3.2:latest` as a fallback when the primary model fails. Override the default with the `OLLAMA_MODEL` environment variable.

### Model Selection by Use Case

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Fast responses on limited hardware
const quickResult = await ai.generate({
  input: { text: "Summarize this text..." },
  provider: "ollama",
  model: "llama3.2:1b",
});

// Balanced general purpose (recommended)
const balancedResult = await ai.generate({
  input: { text: "Analyze this problem..." },
  provider: "ollama",
  model: "llama3.1:8b",
});

// Code generation
const codeResult = await ai.generate({
  input: { text: "Write a Python function to sort a linked list" },
  provider: "ollama",
  model: "codellama:7b",
});

// Deep reasoning
const reasoningResult = await ai.generate({
  input: { text: "Prove this mathematical theorem..." },
  provider: "ollama",
  model: "deepseek-r1:14b",
});

// Image analysis (vision model)
const visionResult = await ai.generate({
  input: {
    text: "Describe what you see",
    images: ["data:image/jpeg;base64,..."],
  },
  provider: "ollama",
  model: "llava:7b",
});
```

### Model Recommendations by System Resources

| RAM    | Recommended Models                                             |
| ------ | -------------------------------------------------------------- |
| 8 GB   | `llama3.2:1b`, `phi3:mini`, `gemma2:2b`                        |
| 16 GB  | `llama3.1:8b`, `mistral:latest`, `codellama:7b`, `qwen3:8b`    |
| 32 GB+ | `llama3.3:70b`, `mixtral:8x7b`, `deepseek-r1:32b`, `qwen3:32b` |
| 64 GB+ | `llama3.1:405b`, `mixtral:8x22b`, `deepseek-v3:latest`         |

---

## Provider Aliases

The Ollama provider is registered with the following aliases in the provider registry:

| Alias    | Description                        |
| -------- | ---------------------------------- |
| `ollama` | Primary provider name              |
| `local`  | Convenience alias for local models |

Both aliases resolve to the same `OllamaProvider`. Use either in the `--provider` flag or the `provider` option:

```bash
# These are equivalent
pnpm run cli -- generate "Hello" --provider ollama
pnpm run cli -- generate "Hello" --provider local
```

---

## OpenAI-Compatible Mode

By default, NeuroLink uses Ollama's native API (`/api/generate`). Setting `OLLAMA_OPENAI_COMPATIBLE=true` switches all requests to the OpenAI-compatible endpoint (`/v1/chat/completions`).

### When to Use OpenAI-Compatible Mode

- Your Ollama deployment only exposes the OpenAI-compatible route (e.g., certain hosted or proxied setups)
- You want consistent message formatting across providers
- You need chat-format messages instead of raw prompt concatenation

### Configuration

```bash
# Enable OpenAI-compatible mode
OLLAMA_OPENAI_COMPATIBLE=true
```

### Behavior Differences

| Feature          | Native Mode (`/api/generate`)      | OpenAI-Compatible Mode (`/v1/chat/completions`) |
| ---------------- | ---------------------------------- | ----------------------------------------------- |
| Message format   | Concatenated prompt string         | Chat messages array                             |
| System prompt    | Sent as `system` field             | Sent as system message role                     |
| Streaming format | NDJSON lines with `response` field | SSE with `data:` prefix, `choices[0].delta`     |
| Image support    | Native `images` field (base64)     | Text-only (images converted to text)            |

:::note[Tool Calling and API Mode]
Tool calling always uses the `/v1/chat/completions` endpoint regardless of the `OLLAMA_OPENAI_COMPATIBLE` setting. This is because Ollama's tool/function calling support is only available through the OpenAI-compatible API.
:::

---

## Tool Use / Function Calling

Ollama supports tool calling through its OpenAI-compatible endpoint. The provider converts tools to the OpenAI function calling format and handles multi-step tool execution in a conversation loop.

### Tool Capability Detection

By default, tool calling is assumed to be supported for all models. You can restrict tool calling to specific models by configuring `OLLAMA_TOOL_CAPABLE_MODELS` or setting `providers.ollama.modelBehavior.toolCapableModels` in the model configuration.

### Recommended Models for Tool Calling

The provider includes static recommendations via `OllamaProvider.getToolCallingRecommendations()`:

| Model                      | Speed | Quality | Size   | Notes                                       |
| -------------------------- | ----- | ------- | ------ | ------------------------------------------- |
| `llama3.1:8b-instruct`     | Fast  | Good    | 4.6 GB | Best balance of speed and tool capability   |
| `mistral:7b-instruct-v0.3` | Fast  | Good    | 4.1 GB | Lightweight with reliable function calling  |
| `hermes3:8b-llama3.1`      | Fast  | Good    | 4.6 GB | Specialized for tool execution              |
| `codellama:34b-instruct`   | Slow  | High    | 19 GB  | Excellent for code-related tool calling     |
| `firefunction-v2:70b`      | Slow  | High    | 40 GB  | Optimized specifically for function calling |

### SDK Example

```typescript
const tools = [
  {
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
      },
      required: ["location"],
    },
  },
];

const result = await ai.generate({
  input: { text: "What's the weather in Tokyo?" },
  provider: "ollama",
  model: "llama3.1:8b",
  tools,
});

console.log(result.toolCalls);
```

### Multi-Step Tool Execution

The provider supports multi-step tool execution with a configurable maximum number of iterations (controlled by `maxSteps`, defaulting to `DEFAULT_MAX_STEPS`). In each iteration:

1. The model receives the conversation history and available tools
2. If the model returns tool calls, NeuroLink executes them automatically
3. Tool results are appended to the conversation history
4. The model is called again with the updated context
5. This repeats until the model returns a final text response or the iteration limit is reached

---

## Streaming Responses

Streaming is supported in both native and OpenAI-compatible modes.

```typescript
const stream = await ai.stream({
  input: { text: "Write a detailed article about local AI" },
  provider: "ollama",
  model: "llama3.1:8b",
});
```

```bash
pnpm run cli -- stream "Write a story about a robot" \
  --provider ollama
```

The provider performs a health check (`GET /api/version`) before each streaming request to give an early, actionable error if Ollama is not running.

---

## Multimodal Capabilities

### Image Analysis

Vision-capable models (LLaVA, Llama 3.2 vision variants) can analyze images. In native mode, images are sent as base64-encoded data in the Ollama `images` field. In OpenAI-compatible mode, images are converted to text descriptions.

```typescript
const result = await ai.generate({
  input: {
    text: "Describe what you see in this image",
    images: ["data:image/jpeg;base64,..."],
  },
  provider: "ollama",
  model: "llava:7b",
});
```

```bash
pnpm run cli -- generate "Describe this image" \
  --provider ollama \
  --model "llava:7b" \
  --image ./photo.jpg
```

:::warning[PDF Support]
PDF inputs are not supported by the Ollama provider. Use a provider with native PDF support (OpenAI, Anthropic, Google Vertex AI, Google AI Studio) for PDF processing.
:::

---

## Configuration Reference

### Environment Variables

| Variable                     | Description                                                      | Default                     | Required |
| ---------------------------- | ---------------------------------------------------------------- | --------------------------- | -------- |
| `OLLAMA_BASE_URL`            | Base URL for the Ollama API                                      | `http://localhost:11434`    | No       |
| `OLLAMA_MODEL`               | Default model to use                                             | `llama3.2:latest`           | No       |
| `OLLAMA_TIMEOUT`             | Request timeout in milliseconds                                  | `240000` (4 minutes)        | No       |
| `OLLAMA_OPENAI_COMPATIBLE`   | Set to `true` to use the OpenAI-compatible API endpoint          | `false`                     | No       |
| `OLLAMA_TOOL_CAPABLE_MODELS` | Comma-separated list of model patterns that support tool calling | (empty, all models assumed) | No       |

### CLI Provider Options

| Flag                | Values               | Description             |
| ------------------- | -------------------- | ----------------------- |
| `--provider` / `-p` | `ollama` or `local`  | Use Ollama provider     |
| `--model` / `-m`    | Any Ollama model tag | Specific model to use   |
| `--image`           | File path            | Image for vision models |

---

## Error Handling

The Ollama provider maps errors to specific error types with actionable guidance:

| Error Type          | Condition                                                   |
| ------------------- | ----------------------------------------------------------- |
| `NetworkError`      | Connection refused (Ollama not running), endpoint not found |
| `InvalidModelError` | Requested model not pulled locally                          |
| `TimeoutError`      | Request exceeded the configured timeout                     |
| `ProviderError`     | Other Ollama-side failures                                  |

---

## Troubleshooting

### "Connection refused" / Ollama not running

The most common error. The provider checks `OLLAMA_BASE_URL` (default `http://localhost:11434`) and will fail if Ollama is not serving.

```bash
# Start Ollama
ollama serve

# Verify it is running
curl http://localhost:11434/api/version

# Check if the port is in use
lsof -i :11434          # macOS/Linux
netstat -an | findstr 11434  # Windows
```

If Ollama is running on a different host or port:

```bash
OLLAMA_BASE_URL=http://your-host:11434
```

### "Model not found"

The model must be pulled before it can be used. Ollama downloads models on demand.

```bash
# Pull the model you need
ollama pull llama3.2:latest

# List installed models
ollama list

# Try a lightweight model first
ollama pull phi3:mini
```

### Timeout errors with large models

Large models (70B+) can take a long time to load into memory on the first request, and inference is slower. Increase the timeout:

```bash
# Increase to 10 minutes for very large models
OLLAMA_TIMEOUT=600000
```

### Slow performance

- Close other memory-intensive applications
- Use a smaller model variant (e.g., `llama3.2:1b` instead of `llama3.1:70b`)
- GPU acceleration is automatic on supported hardware:
  - **Apple Silicon**: Metal acceleration on M1/M2/M3/M4
  - **NVIDIA**: Automatic if CUDA drivers are installed
  - **AMD**: ROCm support on Linux

### Tool calls not working

1. Ensure your model supports function calling (see [Recommended Models for Tool Calling](#recommended-models-for-tool-calling))
2. Tool calling always uses the `/v1/chat/completions` endpoint; verify it is accessible:

```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3.1:8b", "messages": [{"role": "user", "content": "hello"}]}'
```

### 404 errors from the API

The Ollama version may be too old or the API endpoint has changed.

```bash
# Check version
ollama --version

# Update Ollama
# macOS: brew upgrade ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh
```

---

## Privacy and Security

- **All data stays local**: No network calls to external services during inference
- **No telemetry from Ollama**: Ollama does not track usage
- **Air-gap capable**: After pulling models, works entirely offline
- **No API keys stored**: No credentials to manage or rotate

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[Ollama Installation Guide](../../ollama-setup.md)** - Detailed platform-specific installation

---

## Additional Resources

- **[Ollama](https://ollama.ai)** - Official website and downloads
- **[Ollama Model Library](https://ollama.ai/library)** - Browse available models
- **[Ollama GitHub](https://github.com/ollama/ollama)** - Source code and documentation
