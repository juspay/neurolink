---
title: OpenAI-Compatible Providers Guide
description: Access 100+ models through OpenRouter, vLLM, LocalAI and other OpenAI-compatible providers
keywords: openrouter, vllm, localai, openai compatible, self-hosted AI
---

# OpenAI Compatible Provider Guide

**Connect to any OpenAI-compatible API: OpenRouter, vLLM, LocalAI, and more**

---

## Overview

The OpenAI Compatible provider enables NeuroLink to work with any service that implements the OpenAI API specification. This includes third-party aggregators like OpenRouter, self-hosted solutions like vLLM, and custom OpenAI-compatible endpoints.

### Key Benefits

- **🌐 Universal Compatibility**: Works with any OpenAI-compatible endpoint
- **🔄 Provider Aggregation**: Access multiple providers through one endpoint (OpenRouter)
- **🏠 Self-Hosted**: Run your own models with vLLM, LocalAI
- **💰 Cost Optimization**: Compare pricing across providers
- **🔧 Custom Endpoints**: Integrate proprietary AI services
- **📊 Auto-Discovery**: Automatic model detection via `/v1/models` endpoint

### Supported Services

| Service                   | Description                          | Best For               |
| ------------------------- | ------------------------------------ | ---------------------- |
| **OpenRouter**            | AI provider aggregator (100+ models) | Multi-provider access  |
| **vLLM**                  | High-performance inference server    | Self-hosted models     |
| **LocalAI**               | Local OpenAI alternative             | Privacy, offline usage |
| **Text Generation WebUI** | Community inference server           | Local LLMs             |
| **Custom APIs**           | Your own OpenAI-compatible service   | Proprietary models     |

---

## Quick Start

### Option 1: OpenRouter (Recommended for Beginners)

OpenRouter provides access to 100+ models from multiple providers through a single API.

#### 1. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for free account
3. Go to [Keys](https://openrouter.ai/keys)
4. Create new key
5. Add credits ($5 minimum)

#### 2. Configure NeuroLink

```bash
# Add to .env
OPENAI_COMPATIBLE_BASE_URL=https://openrouter.ai/api/v1
OPENAI_COMPATIBLE_API_KEY=sk-or-v1-your-key-here
```

#### 3. Test Setup

```bash
# Auto-discover available models
npx @juspay/neurolink models --provider openai-compatible

# Generate with specific model
npx @juspay/neurolink generate "Hello from OpenRouter!" \
  --provider openai-compatible \
  --model "anthropic/claude-3.5-sonnet"
```

### Option 2: vLLM (Self-Hosted)

vLLM is a high-performance inference server for running models locally.

#### 1. Install vLLM

```bash
# Install vLLM
pip install vllm

# Start server with a model
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --port 8000
```

#### 2. Configure NeuroLink

```bash
# Add to .env
OPENAI_COMPATIBLE_BASE_URL=http://localhost:8000/v1
OPENAI_COMPATIBLE_API_KEY=none  # vLLM doesn't require key
```

#### 3. Test Setup

```bash
npx @juspay/neurolink generate "Hello from vLLM!" \
  --provider openai-compatible
```

### Option 3: LocalAI (Privacy-Focused)

LocalAI runs completely offline for maximum privacy.

#### 1. Install LocalAI

```bash
# Using Docker
docker run -p 8080:8080 \
  -v $PWD/models:/models \
  localai/localai:latest

# Or install directly
curl https://localai.io/install.sh | sh
```

#### 2. Configure NeuroLink

```bash
OPENAI_COMPATIBLE_BASE_URL=http://localhost:8080/v1
OPENAI_COMPATIBLE_API_KEY=none
```

---

## Model Auto-Discovery

NeuroLink automatically discovers available models through the `/v1/models` endpoint.

### Discover Available Models

```bash
# List all models from endpoint
npx @juspay/neurolink models --provider openai-compatible
```

### SDK Auto-Discovery

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Discover models programmatically
const models = await ai.listModels("openai-compatible");
console.log("Available models:", models);

// Use discovered model
const result = await ai.generate({
  input: { text: "Hello!" },
  provider: "openai-compatible",
  model: models[0].id, // Use first available model
});
```

---

## OpenRouter Integration

OpenRouter aggregates 100+ models from multiple providers.

### Available Models on OpenRouter

```bash
# List all OpenRouter models
npx @juspay/neurolink models --provider openai-compatible

# Popular models available:
# - anthropic/claude-3.5-sonnet
# - openai/gpt-4-turbo
# - google/gemini-pro-1.5
# - meta-llama/llama-3-70b-instruct
# - mistralai/mistral-large
```

### Model Selection by Provider

```typescript
// Use Claude through OpenRouter
const claude = await ai.generate({
  input: { text: "Explain quantum computing" },
  provider: "openai-compatible",
  model: "anthropic/claude-3.5-sonnet",
});

// Use GPT-4 through OpenRouter
const gpt4 = await ai.generate({
  input: { text: "Write a poem" },
  provider: "openai-compatible",
  model: "openai/gpt-4-turbo",
});

// Use Gemini through OpenRouter
const gemini = await ai.generate({
  input: { text: "Analyze this data" },
  provider: "openai-compatible",
  model: "google/gemini-pro-1.5",
});
```

### OpenRouter Features

```typescript
// Cost tracking (OpenRouter provides in response)
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "openai-compatible",
  model: "anthropic/claude-3.5-sonnet",
  enableAnalytics: true,
});

console.log("Tokens used:", result.usage.totalTokens);
console.log("Cost:", result.cost); // OpenRouter returns actual cost

// Provider selection preferences
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "openai-compatible",
  model: "openai/gpt-4",
  headers: {
    "X-Provider-Preferences": "order:cost", // Cheapest first
  },
});
```

---

## vLLM Integration

vLLM provides high-performance inference for self-hosted models.

### Starting vLLM Server

```bash
# Basic setup
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --port 8000

# With GPU optimization
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --tensor-parallel-size 2 \  # Multi-GPU
  --gpu-memory-utilization 0.9 \
  --port 8000

# With quantization for lower memory
python -m vllm.entrypoints.openai.api_server \
  --model TheBloke/Mistral-7B-Instruct-v0.2-AWQ \
  --quantization awq \
  --port 8000
```

### NeuroLink Configuration for vLLM

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "openai-compatible",
      config: {
        baseUrl: "http://localhost:8000/v1",
        apiKey: "none", // vLLM doesn't require authentication
        defaultModel: "mistralai/Mistral-7B-Instruct-v0.2",
      },
    },
  ],
});

// Use vLLM-hosted model
const result = await ai.generate({
  input: { text: "Explain Docker containers" },
  provider: "openai-compatible",
});
```

### Multiple vLLM Instances

```typescript
// Load balance across multiple vLLM servers
const ai = new NeuroLink({
  providers: [
    {
      name: "openai-compatible-1",
      config: {
        baseUrl: "http://server1:8000/v1",
        apiKey: "none",
      },
      priority: 1,
    },
    {
      name: "openai-compatible-2",
      config: {
        baseUrl: "http://server2:8000/v1",
        apiKey: "none",
      },
      priority: 1,
    },
  ],
  loadBalancing: "round-robin",
});
```

---

## SDK Integration

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Simple generation
const result = await ai.generate({
  input: { text: "Hello from OpenAI Compatible!" },
  provider: "openai-compatible",
});

console.log(result.content);
```

### With Model Selection

```typescript
// Specify exact model (OpenRouter format)
const result = await ai.generate({
  input: { text: "Explain blockchain" },
  provider: "openai-compatible",
  model: "anthropic/claude-3.5-sonnet",
});

// Or use auto-discovered model
const models = await ai.listModels("openai-compatible");
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "openai-compatible",
  model: models[0].id,
});
```

### Streaming

```typescript
// Stream responses for better UX
for await (const chunk of ai.stream({
  input: { text: "Write a long story" },
  provider: "openai-compatible",
  model: "anthropic/claude-3.5-sonnet",
})) {
  process.stdout.write(chunk.content);
}
```

### Custom Headers

```typescript
// Pass custom headers (e.g., for OpenRouter)
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "openai-compatible",
  headers: {
    "HTTP-Referer": "https://your-app.com",
    "X-Title": "YourApp",
    "X-Provider-Preferences": "order:cost",
  },
});
```

### Error Handling

```typescript
try {
  const result = await ai.generate({
    input: { text: "Your prompt" },
    provider: "openai-compatible",
    model: "non-existent-model",
  });
} catch (error) {
  if (error.message.includes("model not found")) {
    // List available models
    const models = await ai.listModels("openai-compatible");
    console.log(
      "Available models:",
      models.map((m) => m.id),
    );
  } else if (error.message.includes("connection")) {
    console.error("Cannot connect to endpoint");
  } else {
    throw error;
  }
}
```

---

## CLI Usage

### Basic Commands

```bash
# Generate with default model
npx @juspay/neurolink generate "Hello world" --provider openai-compatible

# Use specific model
npx @juspay/neurolink gen "Write code" \
  --provider openai-compatible \
  --model "anthropic/claude-3.5-sonnet"

# Stream response
npx @juspay/neurolink stream "Tell a story" \
  --provider openai-compatible

# List available models
npx @juspay/neurolink models --provider openai-compatible
```

### OpenRouter-Specific Commands

```bash
# Use cheap models for cost optimization
npx @juspay/neurolink gen "Customer support query" \
  --provider openai-compatible \
  --model "meta-llama/llama-3-8b-instruct"  # Cheap

# Use premium models for complex tasks
npx @juspay/neurolink gen "Complex analysis task" \
  --provider openai-compatible \
  --model "anthropic/claude-3-opus"  # Premium
```

---

## Configuration Options

### Environment Variables

```bash
# Required
OPENAI_COMPATIBLE_BASE_URL=https://openrouter.ai/api/v1
OPENAI_COMPATIBLE_API_KEY=sk-or-v1-your-key

# Optional
OPENAI_COMPATIBLE_MODEL=anthropic/claude-3.5-sonnet  # Default model
OPENAI_COMPATIBLE_TIMEOUT=60000  # Timeout (ms)
OPENAI_COMPATIBLE_VERIFY_SSL=true  # SSL verification
```

### Programmatic Configuration

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "openai-compatible",
      config: {
        baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
        defaultModel: "anthropic/claude-3.5-sonnet",
        timeout: 60000,
        headers: {
          "HTTP-Referer": "https://yourapp.com",
          "X-Title": "YourApp",
        },
      },
    },
  ],
});
```

---

## Use Cases

### 1. Multi-Provider Access via OpenRouter

```typescript
// Access multiple providers through one endpoint
const providers = {
  claude: "anthropic/claude-3.5-sonnet",
  gpt4: "openai/gpt-4-turbo",
  gemini: "google/gemini-pro-1.5",
  llama: "meta-llama/llama-3-70b-instruct",
};

for (const [name, model] of Object.entries(providers)) {
  const result = await ai.generate({
    input: { text: "Explain quantum computing in one sentence" },
    provider: "openai-compatible",
    model,
  });
  console.log(`${name}: ${result.content}`);
}
```

### 2. Self-Hosted Private Models

```typescript
// Complete privacy with local vLLM
const privateAI = new NeuroLink({
  providers: [
    {
      name: "openai-compatible",
      config: {
        baseUrl: "http://localhost:8000/v1",
        apiKey: "none",
      },
    },
  ],
});

// Process sensitive data locally
const result = await privateAI.generate({
  input: { text: sensitiveData },
  provider: "openai-compatible",
});
// Data never leaves your infrastructure
```

### 3. Cost Optimization

```typescript
// Compare costs across providers via OpenRouter
async function generateCheapest(prompt: string) {
  const models = [
    {
      name: "llama-3-8b",
      model: "meta-llama/llama-3-8b-instruct",
      costPer1M: 0.2,
    },
    {
      name: "mistral-7b",
      model: "mistralai/mistral-7b-instruct",
      costPer1M: 0.15,
    },
    { name: "gemma-7b", model: "google/gemma-7b-it", costPer1M: 0.1 },
  ];

  // Sort by cost
  models.sort((a, b) => a.costPer1M - b.costPer1M);

  // Try cheapest first
  for (const { model } of models) {
    try {
      return await ai.generate({
        input: { text: prompt },
        provider: "openai-compatible",
        model,
      });
    } catch (error) {
      continue; // Try next model
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Connection refused"

**Problem**: Endpoint is not accessible.

**Solution**:

```bash
# Test endpoint manually (local development)
curl http://localhost:8000/v1/models

# Test endpoint manually (production - always use HTTPS)
curl https://your-production-endpoint.com/v1/models

# Check if server is running
ps aux | grep vllm

# Verify firewall allows connection
telnet localhost 8000
```

#### 2. "Model not found"

**Problem**: Model ID is incorrect or not available.

**Solution**:

```bash
# List available models first
npx @juspay/neurolink models --provider openai-compatible

# Use exact model ID from list
npx @juspay/neurolink gen "test" \
  --provider openai-compatible \
  --model "exact-model-id-from-list"
```

#### 3. "Invalid API key"

**Problem**: API key format is incorrect (OpenRouter).

**Solution**:

```bash
# OpenRouter keys start with sk-or-v1-
OPENAI_COMPATIBLE_API_KEY=sk-or-v1-your-key  # ✅ Correct

# For local servers, use 'none' or empty string
OPENAI_COMPATIBLE_API_KEY=none  # ✅ For vLLM
```

---

## Best Practices

### 1. Model Discovery

```typescript
// ✅ Good: Auto-discover models on startup
const models = await ai.listModels("openai-compatible");
console.log(
  "Available models:",
  models.map((m) => m.id),
);

// Cache model list
const modelCache = new Map();
modelCache.set("openai-compatible", models);
```

### 2. Endpoint Health Checks

```typescript
// ✅ Good: Verify endpoint before use
async function healthCheck() {
  try {
    const models = await ai.listModels("openai-compatible");
    return models.length > 0;
  } catch (error) {
    return false;
  }
}

if (await healthCheck()) {
  // Use provider
} else {
  // Fall back to alternative
}
```

### 3. Cost Tracking

```typescript
// ✅ Good: Track usage with OpenRouter
const result = await ai.generate({
  input: { text: prompt },
  provider: "openai-compatible",
  enableAnalytics: true,
});

await costTracker.record({
  provider: "openrouter",
  model: result.model,
  tokens: result.usage.totalTokens,
  cost: result.cost,
});
```

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce AI costs
- **[Enterprise Multi-Region](../../guides/enterprise/multi-region.md)** - Self-hosted and vLLM deployment

---

## Additional Resources

- **[OpenRouter](https://openrouter.ai/)** - Multi-provider aggregator
- **[vLLM Documentation](https://docs.vllm.ai/)** - Self-hosted inference
- **[LocalAI](https://localai.io/)** - Local OpenAI alternative
- **[OpenAI API Spec](https://platform.openai.com/docs/api-reference)** - API standard

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
