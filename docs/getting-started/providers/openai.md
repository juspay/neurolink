---
title: OpenAI Provider Guide
description: Access GPT-5.4, GPT-5, GPT-4o, o-series reasoning models, and embedding models through the OpenAI API
keywords: openai, gpt, gpt-5.4, gpt-5, gpt-4o, o3, o4-mini, embeddings, function calling, vision, chatgpt
---

# OpenAI Provider Guide

**Access GPT-5.4, GPT-5, GPT-4o, o-series reasoning models, and embedding models through the OpenAI API**

---

## Overview

OpenAI provides API access to the GPT model family, including the latest GPT-5.4 series, GPT-5 series, GPT-4o multimodal models, and o-series reasoning models. NeuroLink integrates with OpenAI via the `@ai-sdk/openai` package, providing generation, streaming, tool calling, vision, and embedding capabilities.

### Key Benefits

- **GPT-5.4 Series**: Newest flagship models (March 2026) with 400K context windows
- **GPT-5 Series**: Flagship models with up to 400K context windows
- **GPT-4.1 Series**: 1M context window models for large document processing
- **GPT-4o**: Multimodal model with vision support
- **o-Series Reasoning**: o3, o3-pro, and o4-mini for deep reasoning tasks
- **Embeddings**: `text-embedding-3-small` and other embedding models
- **Tool/Function Calling**: Full support for agent workflows
- **Streaming**: Real-time streaming responses with tool execution
- **Proxy Support**: Route requests through HTTP/HTTPS/SOCKS proxies

### Provider Aliases

You can reference this provider using any of the following names:

| Alias     | Usage                       |
| --------- | --------------------------- |
| `openai`  | Canonical provider name     |
| `gpt`     | Short alias for convenience |
| `chatgpt` | Alternative alias           |

These aliases are registered in `src/lib/factories/providerRegistry.ts`.

---

## Quick Start

### 1. Get Your API Key

1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **Create new secret key**
4. Copy your new API key (starts with `sk-`)

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-your-key-here

# Optional: Override default model (defaults to gpt-4o-mini)
OPENAI_MODEL=gpt-4o
```

### 3. Test the Setup

=== "SDK Usage"

    ```typescript
    import { NeuroLink } from "@juspay/neurolink";

    const ai = new NeuroLink();

    const result = await ai.generate({
      input: { text: "Explain quantum computing in simple terms" },
      provider: "openai",
      model: "gpt-4o",
    });

    console.log(result.content);
    ```

=== "CLI Usage"

    ```bash
    # Quick generation
    pnpm run cli -- generate "Hello from GPT!" \
      --provider openai

    # Use specific model
    pnpm run cli -- generate "Write a haiku about AI" \
      --provider openai \
      --model "gpt-4o"

    # Interactive loop mode
    pnpm run cli -- loop \
      --provider openai \
      --model "gpt-4o-mini"
    ```

---

## Supported Models

### Available Models (from `OpenAIModels` enum)

| Enum Key              | Model ID              | Series       | Context Window | Notes                |
| --------------------- | --------------------- | ------------ | -------------- | -------------------- |
| `GPT_5_4`             | `gpt-5.4`             | GPT-5.4      | 400K           | **New** (March 2026) |
| `GPT_5_4_MINI`        | `gpt-5.4-mini`        | GPT-5.4      | 400K           | **New** (March 2026) |
| `GPT_5_4_NANO`        | `gpt-5.4-nano`        | GPT-5.4      | 400K           | **New** (March 2026) |
| `GPT_5_3_CODEX`       | `gpt-5.3-codex`       | GPT-5.3      | 400K           |                      |
| `GPT_5_2`             | `gpt-5.2`             | GPT-5.2      | 400K           |                      |
| `GPT_5_2_CHAT_LATEST` | `gpt-5.2-chat-latest` | GPT-5.2      | 128K           |                      |
| `GPT_5_2_PRO`         | `gpt-5.2-pro`         | GPT-5.2      | 400K           |                      |
| `GPT_5_2_CODEX`       | `gpt-5.2-codex`       | GPT-5.2      | 400K           |                      |
| `GPT_5_1`             | `gpt-5.1`             | GPT-5.1      | 400K           |                      |
| `GPT_5_1_CHAT_LATEST` | `gpt-5.1-chat-latest` | GPT-5.1      | 128K           |                      |
| `GPT_5_1_CODEX`       | `gpt-5.1-codex`       | GPT-5.1      | 400K           |                      |
| `GPT_5_1_CODEX_MAX`   | `gpt-5.1-codex-max`   | GPT-5.1      | 400K           |                      |
| `GPT_5_1_CODEX_MINI`  | `gpt-5.1-codex-mini`  | GPT-5.1      | 400K           |                      |
| `GPT_5`               | `gpt-5`               | GPT-5        | 400K           |                      |
| `GPT_5_MINI`          | `gpt-5-mini`          | GPT-5        | 400K           |                      |
| `GPT_5_NANO`          | `gpt-5-nano`          | GPT-5        | 400K           |                      |
| `GPT_5_PRO`           | `gpt-5-pro`           | GPT-5        | 400K           |                      |
| `GPT_5_CHAT_LATEST`   | `gpt-5-chat-latest`   | GPT-5        | 128K           |                      |
| `GPT_5_CODEX`         | `gpt-5-codex`         | GPT-5        | 400K           |                      |
| `GPT_OSS_120B`        | `gpt-oss-120b`        | GPT OSS      | 128K           |                      |
| `GPT_OSS_20B`         | `gpt-oss-20b`         | GPT OSS      | 128K           |                      |
| `GPT_4_1`             | `gpt-4.1`             | GPT-4.1      | 1M             |                      |
| `GPT_4_1_MINI`        | `gpt-4.1-mini`        | GPT-4.1      | 1M             |                      |
| `GPT_4_1_NANO`        | `gpt-4.1-nano`        | GPT-4.1      | 1M             |                      |
| `GPT_4O`              | `gpt-4o`              | GPT-4o       | 128K           |                      |
| `GPT_4O_MINI`         | `gpt-4o-mini`         | GPT-4o       | 128K           | **Default model**    |
| `O3`                  | `o3`                  | O-Series     | 200K           |                      |
| `O3_MINI`             | `o3-mini`             | O-Series     | 200K           |                      |
| `O3_PRO`              | `o3-pro`              | O-Series     | 200K           |                      |
| `O4_MINI`             | `o4-mini`             | O-Series     | 200K           |                      |
| `O1`                  | `o1`                  | O-Series     | 200K           |                      |
| `O1_PREVIEW`          | `o1-preview`          | O-Series     | 128K           | Deprecated           |
| `O1_MINI`             | `o1-mini`             | O-Series     | 128K           | **Deprecated**       |
| `GPT_4`               | `gpt-4`               | GPT-4 Legacy | 8K             |                      |
| `GPT_4_TURBO`         | `gpt-4-turbo`         | GPT-4 Legacy | 128K           |                      |
| `GPT_3_5_TURBO`       | `gpt-3.5-turbo`       | Legacy       | 16K            |                      |

Context window sizes are sourced from `src/lib/constants/contextWindows.ts`. Models without explicit entries use the provider default of 128K.

### Default Model

The default model when no model is specified is **`gpt-4o-mini`** (set via `OpenAIModels.GPT_4O_MINI` in the provider registry). This can be overridden with the `OPENAI_MODEL` environment variable.

> **Note:** When using NeuroLink SDK/CLI, the default is `gpt-4o-mini`. When instantiating `OpenAIProvider` directly without setting `OPENAI_MODEL`, the internal fallback is `gpt-4o`.

### Model Selection by Use Case

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Fast, cost-effective responses
const quickResult = await ai.generate({
  input: { text: "Summarize this text..." },
  provider: "openai",
  model: "gpt-4o-mini",
});

// Balanced multimodal performance
const balancedResult = await ai.generate({
  input: { text: "Analyze this code..." },
  provider: "openai",
  model: "gpt-4o",
});

// Latest flagship model
const flagshipResult = await ai.generate({
  input: { text: "Design a distributed system" },
  provider: "openai",
  model: "gpt-5.4",
});

// Deep reasoning with o-series
const reasoningResult = await ai.generate({
  input: { text: "Prove this mathematical theorem..." },
  provider: "openai",
  model: "o3",
});

// Large context with GPT-4.1 (1M tokens)
const largeContextResult = await ai.generate({
  input: { text: "Analyze this entire codebase..." },
  provider: "openai",
  model: "gpt-4.1",
});
```

---

## Multimodal Capabilities

Models listed in `VISION_CAPABILITIES` for the `openai` provider support image analysis. This includes the GPT-5 family, GPT-4.1 family, GPT-4o family, and o-series models.

### Image Analysis

```typescript
const result = await ai.generate({
  input: {
    text: "Describe what you see in this image",
    images: ["data:image/jpeg;base64,..."],
  },
  provider: "openai",
  model: "gpt-4o",
});
```

```bash
# From file path (CLI)
pnpm run cli -- generate "Describe this image" \
  --provider openai \
  --model gpt-4o \
  --image ./photo.jpg
```

The provider supports up to **10 images per request** (defined in `IMAGE_LIMITS` in `src/lib/adapters/providerImageAdapter.ts`).

---

## Embedding Support

The OpenAI provider implements both `embed()` and `embedMany()` methods for generating vector embeddings.

### Default Embedding Model

The default embedding model is **`text-embedding-3-small`**. This can be overridden with the `OPENAI_EMBEDDING_MODEL` environment variable.

> **Note:** The `OPENAI_EMBEDDING_MODEL` env var is read by `getDefaultEmbeddingModel()`, but the public `embed()`/`embedMany()` methods fall back to `text-embedding-3-small` directly when no model argument is passed. To use a custom embedding model, pass it as the `modelName` parameter to `embed(text, modelName)`.

### Single Embedding

```typescript
const ai = new NeuroLink();

// Generate a single embedding
const result = await ai.generate({
  input: { text: "Hello world" },
  provider: "openai",
});

// Or use the provider directly
const embedding = await provider.embed("Hello world");
// Returns: number[] (e.g., 1536-dimensional vector)
```

### Batch Embeddings

```typescript
const embeddings = await provider.embedMany([
  "First document",
  "Second document",
  "Third document",
]);
// Returns: number[][] (array of embedding vectors)
```

### Custom Embedding Model

```typescript
// Use a specific embedding model
const embedding = await provider.embed("Hello world", "text-embedding-3-large");
```

### Server Endpoints

Embeddings are also available via server routes:

- `POST /api/agent/embed` -- Single text embedding
- `POST /api/agent/embed-many` -- Batch text embeddings

---

## Tool / Function Calling

The OpenAI provider fully supports tool use (`supportsTools()` returns `true`). Tools are validated and filtered for OpenAI compatibility before being sent to the API.

```typescript
import { z } from "zod";
import { tool } from "ai";

const weatherTool = tool({
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    return { temperature: 72, condition: "sunny", location };
  },
});

const result = await ai.generate({
  input: { text: "What's the weather in Tokyo?" },
  provider: "openai",
  model: "gpt-4o",
  tools: { get_weather: weatherTool },
});
```

### Tool Limits

The provider enforces a maximum tool count (default: 150, configurable via the `OPENAI_MAX_TOOLS` environment variable). Tools exceeding this limit are silently truncated.

### Tool Validation

The provider performs OpenAI-specific validation on each tool before sending:

- Tools must have a `description` (string) and `execute` (function)
- Parameters must be either a Zod schema or a valid JSON schema with `type: "object"`
- Invalid tools are filtered out with a warning log

---

## Streaming Responses

```typescript
const stream = await ai.stream({
  input: { text: "Write a detailed article about AI" },
  provider: "openai",
  model: "gpt-4o",
});

for await (const chunk of stream.stream) {
  process.stdout.write(chunk.content);
}
```

The streaming implementation uses the Vercel AI SDK `streamText` with `fullStream` for handling both text and tool call chunks. Multi-step tool execution is supported with configurable `maxSteps`.

### CLI Streaming

```bash
pnpm run cli -- stream "Write a story about a robot" \
  --provider openai \
  --model gpt-4o
```

---

## Proxy Support

The OpenAI provider uses `createProxyFetch()` to route API requests through a proxy when configured. The proxy is detected from standard environment variables:

```bash
# HTTPS proxy (recommended for OpenAI API calls)
HTTPS_PROXY=http://proxy.example.com:8080

# HTTP proxy
HTTP_PROXY=http://proxy.example.com:8080

# Catch-all proxy
ALL_PROXY=http://proxy.example.com:8080

# SOCKS proxy
SOCKS_PROXY=socks5://proxy.example.com:1080

# Bypass proxy for specific hosts
NO_PROXY=localhost,127.0.0.1,.internal.example.com
```

Priority order: protocol-specific (`HTTPS_PROXY` / `HTTP_PROXY`) > `ALL_PROXY` > `SOCKS_PROXY`.

Both the generation/streaming requests and embedding requests use proxy-aware fetch.

---

## Configuration Reference

### Environment Variables

| Variable                 | Description                                | Default                  | Required |
| ------------------------ | ------------------------------------------ | ------------------------ | -------- |
| `OPENAI_API_KEY`         | API key for authentication                 | -                        | Yes      |
| `OPENAI_MODEL`           | Default model to use                       | `gpt-4o-mini`            | No       |
| `OPENAI_EMBEDDING_MODEL` | Default embedding model                    | `text-embedding-3-small` | No       |
| `OPENAI_MAX_TOOLS`       | Maximum number of tools per request        | `150`                    | No       |
| `HTTPS_PROXY`            | HTTPS proxy URL                            | -                        | No       |
| `HTTP_PROXY`             | HTTP proxy URL                             | -                        | No       |
| `ALL_PROXY`              | Catch-all proxy URL                        | -                        | No       |
| `NO_PROXY`               | Comma-separated list of proxy bypass hosts | -                        | No       |

### CLI Provider Options

| Flag                | Values                     | Description           |
| ------------------- | -------------------------- | --------------------- |
| `--provider` / `-p` | `openai`, `gpt`, `chatgpt` | Use OpenAI provider   |
| `--model` / `-m`    | model ID string            | Specific model to use |
| `--temperature`     | 0.0 - 2.0                  | Sampling temperature  |
| `--max-tokens`      | integer                    | Maximum output tokens |

---

## Error Handling

The OpenAI provider maps errors to specific error types:

| Error Type            | Condition                                                |
| --------------------- | -------------------------------------------------------- |
| `AuthenticationError` | Invalid API key (`API_KEY_INVALID` or `invalid_api_key`) |
| `RateLimitError`      | Rate limit exceeded (`rate_limit_error`)                 |
| `InvalidModelError`   | Model not found (`model_not_found`)                      |
| `NetworkError`        | Timeout errors                                           |
| `ProviderError`       | All other OpenAI API errors                              |

### Common Issues

#### "Invalid OpenAI API key"

```bash
# Verify key is set
echo $OPENAI_API_KEY | head -c 10
# Expected: sk-xxxxxxxx...

# Get new key at https://platform.openai.com/api-keys
```

#### "Rate limit exceeded"

1. Wait and retry (the error message includes timing guidance)
2. Reduce request frequency
3. Use a smaller model (e.g., `gpt-4o-mini` instead of `gpt-4o`)
4. Request a rate limit increase from OpenAI

#### "Model not found"

Verify the model ID matches one of the values in the `OpenAIModels` enum. Model IDs are case-sensitive.

---

## Best Practices

### Security

- **Never commit API keys** to version control
- Use environment variables or secrets management
- Rotate API keys periodically

```bash
# Use .env file (not committed to git)
echo "OPENAI_API_KEY=sk-..." >> .env

# Add to .gitignore
echo ".env" >> .gitignore
```

### Cost Optimization

- Use `gpt-4o-mini` for routine tasks (significantly cheaper than `gpt-4o`)
- Use `gpt-5-nano` for simple classification or extraction tasks
- Reserve `gpt-5.2-pro` and `o3-pro` for tasks requiring maximum capability
- Monitor token usage via the OpenAI dashboard

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** -- General provider configuration
- **[OpenAI Compatible Provider](./openai-compatible.md)** -- For OpenRouter, vLLM, and other OpenAI-compatible endpoints
- **[Azure OpenAI Provider](./azure-openai.md)** -- Azure-hosted OpenAI models

---

## Additional Resources

- **[OpenAI Platform](https://platform.openai.com)** -- Manage API keys and usage
- **[OpenAI Documentation](https://platform.openai.com/docs)** -- Official API docs
- **[OpenAI Pricing](https://openai.com/pricing)** -- Pricing details
- **[OpenAI Models](https://platform.openai.com/docs/models)** -- Model specifications
