# Gateway Provider System - Configuration Guide

This document describes how to configure the Gateway Provider System for different use cases.

## Environment Variables

### Required for Direct Routing

Direct routing sends requests directly to the AI provider's API.

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google AI Studio
GOOGLE_AI_STUDIO_API_KEY=AIza...

# Google Vertex AI
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Mistral AI
MISTRAL_API_KEY=...

# AWS Bedrock
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Azure OpenAI
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
```

### Required for Gateway Routing

Gateway routing sends requests through a unified gateway (OpenRouter or LiteLLM).

```bash
# OpenRouter (recommended)
OPENROUTER_API_KEY=sk-or-...

# LiteLLM (self-hosted)
LITELLM_API_KEY=...
LITELLM_BASE_URL=http://localhost:4000
```

### Optional Configuration

```bash
# Debug logging
DEBUG=neurolink:gateway:*

# Registry caching
NEUROLINK_REGISTRY_CACHE_TTL=3600000  # 1 hour in ms
NEUROLINK_REGISTRY_CACHE_SIZE=10000   # max entries

# Rate limiting
NEUROLINK_RATE_LIMIT_ENABLED=true
NEUROLINK_RATE_LIMIT_REQUESTS=100
NEUROLINK_RATE_LIMIT_WINDOW=60000  # 1 minute in ms
```

## Routing Strategies

### 1. Direct Routing (Default)

Sends requests directly to the provider when an API key is available.

```typescript
// SDK
const result = await neurolink.generate({
  model: "openai/gpt-4o",  // Uses OPENAI_API_KEY directly
  input: { text: "Hello" },
});

// CLI
neurolink generate "Hello" --model=openai/gpt-4o
```

**Pros:**

- Lower latency
- Full feature support
- No middleman

**Cons:**

- Requires API key for each provider
- No automatic fallback across providers

### 2. OpenRouter Gateway

Routes through OpenRouter to access 100+ models with a single API key.

```typescript
// SDK
const provider = await neurolink.gateway("openai/gpt-4o", {
  routing: "openrouter",
});

// CLI
neurolink generate "Hello" --gateway=openrouter --model=openai/gpt-4o
```

**Pros:**

- Single API key for all providers
- Automatic load balancing
- Cost tracking

**Cons:**

- Slightly higher latency
- Some features may not be supported

### 3. Auto Routing

Automatically chooses the best routing strategy.

```typescript
// SDK
const provider = await neurolink.gateway("openai/gpt-4o", {
  routing: "auto", // Uses direct if key available, otherwise gateway
});
```

**Decision logic:**

1. Check if direct API key is available
2. If yes, use direct routing
3. If no, check for gateway key (OpenRouter/LiteLLM)
4. If gateway key available, use gateway routing
5. If neither, throw error

### 4. LiteLLM Gateway (Self-Hosted)

Route through a self-hosted LiteLLM proxy.

```typescript
const provider = await neurolink.gateway("openai/gpt-4o", {
  routing: "litellm",
  gateway: {
    baseUrl: "http://localhost:4000",
    apiKey: process.env.LITELLM_API_KEY,
  },
});
```

## Provider Configuration

### Provider-Specific Options

```typescript
// OpenAI-specific
const result = await neurolink.generate({
  model: "openai/gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
  presencePenalty: 0.1,
  frequencyPenalty: 0.1,
});

// Anthropic-specific
const result = await neurolink.generate({
  model: "anthropic/claude-3-5-sonnet",
  temperature: 0.7,
  maxTokens: 4096,
  topK: 40,
});

// Google-specific
const result = await neurolink.generate({
  model: "google/gemini-1.5-pro",
  temperature: 0.7,
  maxTokens: 8192,
  thinkingLevel: "medium",
});
```

### Fallback Configuration

Configure automatic failover between models.

```typescript
const provider = await neurolink.gateway("openai/gpt-4o", {
  fallback: {
    models: ["anthropic/claude-3-5-sonnet", "google/gemini-1.5-pro"],
    retries: 2,
    retryDelayMs: 1000,
  },
});
```

**Fallback trigger conditions:**

- Rate limit errors (429)
- Server errors (500, 502, 503)
- Model not available
- Timeout errors

## Registry Configuration

### Registry Sources

The gateway fetches model information from multiple sources:

1. **models.dev** - Comprehensive model database
2. **OpenRouter** - Real-time model availability

```typescript
// Configure registry sources
const provider = await neurolink.gateway("openai/gpt-4o", {
  registry: {
    sources: ["models.dev", "openrouter"],
    preferredSource: "openrouter",
    cacheTTL: 3600000, // 1 hour
  },
});
```

### Cache Configuration

```typescript
// Configure registry cache
import { getGlobalCache } from "neurolink/gateway";

const cache = getGlobalCache();
cache.configure({
  maxSize: 10000,
  defaultTTL: 3600000,
  cleanupInterval: 60000,
});
```

## CLI Configuration

### Config File

Create `.neurolinkrc.json` in your project root:

```json
{
  "gateway": {
    "defaultRouting": "auto",
    "defaultProvider": "vertex",
    "fallback": {
      "enabled": true,
      "models": ["anthropic/claude-3-5-sonnet", "google/gemini-1.5-pro"],
      "retries": 2
    },
    "registry": {
      "sources": ["models.dev", "openrouter"],
      "cacheTTL": 3600000
    }
  }
}
```

### Environment-Based Config

```bash
# Development
export NEUROLINK_GATEWAY_ROUTING=direct
export NEUROLINK_GATEWAY_DEBUG=true

# Production
export NEUROLINK_GATEWAY_ROUTING=auto
export NEUROLINK_GATEWAY_FALLBACK_ENABLED=true
```

## Security Considerations

### API Key Management

1. **Never commit API keys** to version control
2. Use environment variables or secrets management
3. Rotate keys regularly
4. Use separate keys for development and production

### Rate Limiting

Configure rate limiting to protect against abuse:

```typescript
const provider = await neurolink.gateway("openai/gpt-4o", {
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000,
    retryAfterMs: 5000,
  },
});
```

### Logging

Configure logging for debugging and auditing:

```typescript
import { logger } from "neurolink";

logger.configure({
  level: "debug",
  format: "json",
  redactKeys: ["apiKey", "authorization"],
});
```

## Troubleshooting

### Common Configuration Issues

1. **"No API key found"**
   - Check environment variable name spelling
   - Ensure variable is exported
   - Verify key is not empty

2. **"Model not found"**
   - Check model string format (`provider/model`)
   - Verify model exists in registry
   - Try refreshing registry cache

3. **"Rate limit exceeded"**
   - Increase retry delays
   - Configure fallback models
   - Use a different provider

4. **"Gateway routing failed"**
   - Check OpenRouter/LiteLLM API key
   - Verify gateway base URL
   - Check network connectivity
