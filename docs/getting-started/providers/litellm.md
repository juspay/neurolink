---
title: LiteLLM Provider Guide
description: Access hundreds of AI models across 100+ providers through the NeuroLink LiteLLM provider via a LiteLLM proxy server
keywords: litellm, proxy, multi-provider, load balancing, cost tracking
---

# LiteLLM Provider Guide

**Access hundreds of AI models across 100+ providers through the NeuroLink LiteLLM provider via a LiteLLM proxy server**

---

## Overview

NeuroLink's `litellm` provider connects to a [LiteLLM proxy server](https://docs.litellm.ai/) to access hundreds of models across 100+ AI providers (OpenAI, Anthropic, Google, AWS Bedrock, Cohere, Groq, Together AI, and more) through a single OpenAI-compatible API. The proxy adds enterprise features like load balancing, fallbacks, budgets, and rate limiting on top of any AI provider.

### How It Works

1. You run (or connect to) a **LiteLLM proxy server** that manages your provider API keys and model routing.
2. NeuroLink's `litellm` provider communicates with this proxy using the OpenAI-compatible protocol.
3. Models are referenced using LiteLLM's `provider/model` format (e.g., `openai/gpt-4o-mini`, `anthropic/claude-3-5-sonnet-20240620`).

### Key Benefits

- **100+ Providers**: Access hundreds of models across every major AI provider through one interface
- **Unified Model Format**: Use `provider/model` naming across all backends
- **Load Balancing**: Distribute requests across multiple providers/models
- **Cost Tracking**: Built-in budget management and spend tracking
- **Fallbacks**: Automatic failover when providers are down
- **Proxy Mode**: Run as standalone proxy server for team-wide use

---

## Quick Start

### 1. Set Up a LiteLLM Proxy Server

Before using the NeuroLink `litellm` provider, you need a running LiteLLM proxy. See the [Setting Up LiteLLM Proxy](#setting-up-litellm-proxy) section below for full details, or get started quickly:

```bash
pip install 'litellm[proxy]'
litellm --model openai/gpt-4o-mini --port 4000
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Required: URL of your LiteLLM proxy server
LITELLM_BASE_URL=http://localhost:4000

# Optional: API key for the proxy (default: "sk-anything")
LITELLM_API_KEY=sk-your-proxy-key

# Optional: Override the default model (default: openai/gpt-4o-mini)
LITELLM_MODEL=openai/gpt-4o-mini
```

### 3. Test the Setup

```bash
# CLI - Generate with the LiteLLM provider
npx @juspay/neurolink generate "Hello from LiteLLM!" --provider litellm

# CLI - Verify the connection
npx @juspay/neurolink generate "Explain AI" --provider litellm
```

---

## Environment Variables

| Variable           | Required | Default                 | Description                               |
| ------------------ | -------- | ----------------------- | ----------------------------------------- |
| `LITELLM_BASE_URL` | No       | `http://localhost:4000` | URL of your LiteLLM proxy server          |
| `LITELLM_API_KEY`  | No       | `sk-anything`           | API key for authenticating with the proxy |
| `LITELLM_MODEL`    | No       | `openai/gpt-4o-mini`    | Default model in `provider/model` format  |

---

## Default Model

The default model is `openai/gpt-4o-mini` (from `LiteLLMModels.OPENAI_GPT_4O_MINI`). Override it by setting `LITELLM_MODEL` in your environment or passing `--model` on the CLI.

---

## Model Name Format

LiteLLM uses a `provider/model` format for model names. Examples:

```
openai/gpt-4o-mini          # OpenAI
openai/gpt-4o               # OpenAI
anthropic/claude-3-5-sonnet-20240620  # Anthropic
vertex_ai/gemini-2.5-pro    # Google Vertex AI
gemini/gemini-2.0-flash     # Google AI Studio
groq/llama-3.1-70b-versatile  # Groq
mistral/mistral-large-latest  # Mistral AI
bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0  # AWS Bedrock
together_ai/meta-llama/Llama-3-70b-chat-hf         # Together AI
```

See the full list at [LiteLLM Supported Providers](https://docs.litellm.ai/docs/providers).

---

## SDK Usage

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Generate with the default LiteLLM model (openai/gpt-4o-mini)
const result = await ai.generate({
  input: { text: "Hello from LiteLLM!" },
  provider: "litellm",
});

console.log(result.content);
```

### With a Specific Model

```typescript
// Use Anthropic Claude via LiteLLM
const result = await ai.generate({
  input: { text: "Explain quantum computing" },
  provider: "litellm",
  model: "anthropic/claude-3-5-sonnet-20240620",
});

// Use Google Gemini via LiteLLM
const geminiResult = await ai.generate({
  input: { text: "Summarize this article" },
  provider: "litellm",
  model: "gemini/gemini-2.0-flash",
});
```

### Streaming

```typescript
const result = await ai.stream({
  input: { text: "Write a story about space exploration" },
  provider: "litellm",
  model: "openai/gpt-4o",
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

### Multi-Model Workflow

```typescript
// Route requests to different models based on complexity
async function generateSmart(
  prompt: string,
  complexity: "low" | "medium" | "high",
) {
  const modelMap = {
    low: "openai/gpt-4o-mini",
    medium: "anthropic/claude-3-5-sonnet-20240620",
    high: "openai/gpt-4o",
  };

  return await ai.generate({
    input: { text: prompt },
    provider: "litellm",
    model: modelMap[complexity],
  });
}
```

---

## CLI Usage

```bash
# Generate with default model
npx @juspay/neurolink generate "Hello LiteLLM" --provider litellm

# Use a specific model
npx @juspay/neurolink generate "Write code" --provider litellm --model "openai/gpt-4o"

# Stream a response
npx @juspay/neurolink stream "Tell a story" --provider litellm

# Interactive loop mode
npx @juspay/neurolink loop --provider litellm

# With temperature and max tokens
npx @juspay/neurolink generate "Creative writing prompt" \
  --provider litellm \
  --model "anthropic/claude-3-5-sonnet-20240620" \
  --temperature 0.9 \
  --max-tokens 1000
```

---

## Available Models

The `LiteLLMModels` enum provides commonly used model identifiers:

| Enum Value                     | Model ID                               |
| ------------------------------ | -------------------------------------- |
| `OPENAI_GPT_4O_MINI`           | `openai/gpt-4o-mini`                   |
| `OPENAI_GPT_4O`                | `openai/gpt-4o`                        |
| `OPENAI_GPT_5`                 | `openai/gpt-5`                         |
| `ANTHROPIC_CLAUDE_SONNET_4_6`  | `anthropic/claude-sonnet-4-6`          |
| `ANTHROPIC_CLAUDE_3_5_SONNET`  | `anthropic/claude-3-5-sonnet-20240620` |
| `VERTEX_GEMINI_2_5_PRO`        | `vertex_ai/gemini-2.5-pro`             |
| `GEMINI_2_0_FLASH`             | `gemini/gemini-2.0-flash`              |
| `GROQ_LLAMA_3_1_70B_VERSATILE` | `groq/llama-3.1-70b-versatile`         |
| `MISTRAL_LARGE`                | `mistral/mistral-large-latest`         |

You can also pass any model string your LiteLLM proxy is configured to serve. Use the proxy's `/v1/models` endpoint to discover available models dynamically.

---

## Error Handling

The LiteLLM provider returns specific error types for common failure scenarios:

| Error                         | Cause                               | Resolution                                               |
| ----------------------------- | ----------------------------------- | -------------------------------------------------------- |
| `NetworkError` (ECONNREFUSED) | LiteLLM proxy server is not running | Start the proxy at the configured `LITELLM_BASE_URL`     |
| `AuthenticationError`         | Invalid `LITELLM_API_KEY`           | Check your API key matches the proxy's master key        |
| `RateLimitError`              | Upstream rate limit exceeded        | Wait and retry, or configure load balancing in the proxy |
| `InvalidModelError`           | Model not configured in proxy       | Add the model to your LiteLLM proxy configuration        |

---

## Setting Up LiteLLM Proxy

The NeuroLink `litellm` provider requires a running LiteLLM proxy server. This section covers how to set one up.

### Install LiteLLM

```bash
pip install 'litellm[proxy]'
```

### Quick Start (Single Model)

```bash
# Start a proxy that routes to a single model
litellm --model openai/gpt-4o-mini --port 4000
```

### Configuration File (Multiple Models)

Create `litellm_config.yaml`:

```yaml
model_list:
  - model_name: openai/gpt-4o-mini
    litellm_params:
      model: gpt-4o-mini
      api_key: ${OPENAI_API_KEY}

  - model_name: anthropic/claude-3-5-sonnet
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: ${ANTHROPIC_API_KEY}

  - model_name: gemini/gemini-pro
    litellm_params:
      model: gemini/gemini-pro
      api_key: ${GOOGLE_API_KEY}

general_settings:
  master_key: ${LITELLM_MASTER_KEY}
```

Start the proxy:

```bash
litellm --config litellm_config.yaml --port 4000
```

### Load Balancing

Distribute requests across multiple providers or API keys:

```yaml
model_list:
  - model_name: gpt-4-balanced
    litellm_params:
      model: gpt-4
      api_key: ${OPENAI_API_KEY_1}

  - model_name: gpt-4-balanced
    litellm_params:
      model: gpt-4
      api_key: ${OPENAI_API_KEY_2}

router_settings:
  routing_strategy: simple-shuffle
```

### Automatic Failover

Configure fallback providers for reliability:

```yaml
model_list:
  - model_name: smart-model
    litellm_params:
      model: gpt-4
      api_key: ${OPENAI_API_KEY}

  - model_name: smart-model
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: ${ANTHROPIC_API_KEY}

router_settings:
  enable_fallbacks: true
  num_retries: 2
```

### Budget Management

Set spending limits per virtual key:

```bash
litellm --config config.yaml --create_key \
  --key_name "team-frontend" \
  --budget 100
```

### Docker Deployment

```yaml
# docker-compose.yml
version: "3.8"

services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    command: ["litellm", "--config", "/app/config.yaml", "--port", "4000"]
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

---

## Troubleshooting

### Common Issues

#### 1. "LiteLLM proxy server not available"

**Problem**: The proxy server is not running or is unreachable.

**Solution**:

```bash
# Check if proxy is running
curl http://localhost:4000/health

# Start proxy
litellm --config litellm_config.yaml --port 4000

# Verify LITELLM_BASE_URL points to the correct address
echo $LITELLM_BASE_URL
```

#### 2. "Invalid LiteLLM configuration"

**Problem**: The API key does not match the proxy's master key.

**Solution**:

```bash
# Verify master_key in proxy config
grep master_key litellm_config.yaml

# Ensure LITELLM_API_KEY matches
echo $LITELLM_API_KEY
```

#### 3. "Model not available in LiteLLM proxy"

**Problem**: The requested model is not configured in the proxy's `model_list`.

**Solution**:

```yaml
# Add the model to litellm_config.yaml
model_list:
  - model_name: your-model
    litellm_params:
      model: openai/gpt-4o
      api_key: ${OPENAI_API_KEY}
```

Then restart the proxy.

#### 4. "Rate limit exceeded"

**Problem**: Upstream provider rate limit hit.

**Solution**: Configure load balancing across multiple API keys or providers in your LiteLLM proxy config.

---

## Related Documentation

- **[OpenAI Compatible Guide](./openai-compatible.md)** - OpenAI-compatible providers
- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce AI costs

---

## Additional Resources

- **[LiteLLM Documentation](https://docs.litellm.ai/)** - Official docs
- **[Supported Providers](https://docs.litellm.ai/docs/providers)** - 100+ providers list
- **[LiteLLM GitHub](https://github.com/BerriAI/litellm)** - Source code
- **[LiteLLM Proxy Docs](https://docs.litellm.ai/docs/proxy/quick_start)** - Proxy setup

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
