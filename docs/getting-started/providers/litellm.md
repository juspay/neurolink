---
title: LiteLLM Provider Guide
description: Access 100+ AI providers through LiteLLM proxy with load balancing and cost tracking
keywords: litellm, proxy, multi-provider, load balancing, cost tracking
---

# LiteLLM Provider Guide

**Access 100+ AI providers through a unified OpenAI-compatible proxy with advanced features**

---

## Overview

LiteLLM is a powerful proxy server that unifies access to 100+ AI providers (OpenAI, Anthropic, Azure, Vertex, Bedrock, Cohere, etc.) through a single OpenAI-compatible API. It adds enterprise features like load balancing, fallbacks, budgets, and rate limiting on top of any AI provider.

### Key Benefits

- **🌐 100+ Providers**: Access every major AI provider through one interface
- **🔄 Load Balancing**: Distribute requests across multiple providers/models
- **💰 Cost Tracking**: Built-in budget management and spend tracking
- **⚡ Fallbacks**: Automatic failover when providers are down
- **🔧 Proxy Mode**: Run as standalone proxy server for team-wide use
- **📊 Observability**: Detailed logging, metrics, and analytics
- **🔐 Virtual Keys**: Manage API keys centrally with role-based access

### Use Cases

- **Multi-Provider Access**: Unified interface for all AI providers
- **Load Balancing**: Distribute load across providers for reliability
- **Cost Management**: Track and limit AI spending across teams
- **Provider Migration**: Easy switching between providers
- **Team Collaboration**: Centralized proxy for entire organization
- **Enterprise Features**: Budgets, rate limits, audit logs

---

## Quick Start

### Option 1: Direct Integration (SDK Only)

Use LiteLLM directly in your code without running a proxy server.

#### 1. Install LiteLLM

```bash
pip install litellm
```

#### 2. Configure NeuroLink

```bash
# Add provider API keys to .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
```

#### 3. Use via LiteLLM Python Client

```python
import litellm

# Use any provider with OpenAI-compatible interface
response = litellm.completion(
  model="gpt-4",
  messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)

# Switch providers easily
response = litellm.completion(
  model="claude-3-5-sonnet-20241022",  # Anthropic
  messages=[{"role": "user", "content": "Hello!"}]
)

response = litellm.completion(
  model="gemini/gemini-pro",  # Google AI
  messages=[{"role": "user", "content": "Hello!"}]
)
```

### Option 2: Proxy Server (Recommended for Teams)

Run LiteLLM as a standalone proxy server for team-wide access.

#### 1. Install LiteLLM

```bash
pip install 'litellm[proxy]'
```

#### 2. Create Configuration File

Create `litellm_config.yaml`:

```yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: ${OPENAI_API_KEY} # Use env vars for all secrets

  - model_name: claude-3-5-sonnet
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: ${ANTHROPIC_API_KEY} # Use env vars for all secrets

  - model_name: gemini-pro
    litellm_params:
      model: gemini/gemini-pro
      api_key: ${GOOGLE_API_KEY} # Use env vars for all secrets

  # Optional: Load balancing across multiple instances
  # SECURITY: Use environment variables or secret management (e.g., AWS Secrets Manager, HashiCorp Vault)
  - model_name: gpt-4-balanced
    litellm_params:
      model: gpt-4
      api_key: ${OPENAI_API_KEY_1} # Use env vars for all secrets

  - model_name: gpt-4-balanced
    litellm_params:
      model: gpt-4
      api_key: ${OPENAI_API_KEY_2} # Use env vars for all secrets

general_settings:
  master_key: ${LITELLM_MASTER_KEY} # Use env vars for all secrets
  database_url: "postgresql://..." # Optional: for persistence
```

#### 3. Start Proxy Server

```bash
litellm --config litellm_config.yaml --port 8000
```

#### 4. Configure NeuroLink to Use Proxy

```bash
# Add to .env
OPENAI_COMPATIBLE_BASE_URL=http://localhost:8000
OPENAI_COMPATIBLE_API_KEY=sk-1234  # Your master_key from config
```

#### 5. Test Setup

```bash
# Test via NeuroLink
npx @juspay/neurolink generate "Hello from LiteLLM!" \
  --provider openai-compatible \
  --model "gpt-4"

# Or use any OpenAI-compatible client
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer sk-1234" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## Provider Support

### Supported Providers (100+)

LiteLLM supports all major AI providers:

| Category        | Providers                                                             |
| --------------- | --------------------------------------------------------------------- |
| **Major Cloud** | OpenAI, Anthropic, Google (Gemini, Vertex), Azure OpenAI, AWS Bedrock |
| **Open Source** | Hugging Face, Together AI, Replicate, Ollama, vLLM, LocalAI           |
| **Specialized** | Cohere, AI21, Aleph Alpha, Perplexity, Groq, Fireworks AI             |
| **Aggregators** | OpenRouter, Anyscale, Deep Infra, Mistral AI                          |
| **Enterprise**  | SageMaker, Cloudflare Workers AI, Azure AI Studio                     |
| **Custom**      | Any OpenAI-compatible endpoint                                        |

### Model Name Format

```yaml
# OpenAI (default prefix)
model: gpt-4                    # openai/gpt-4
model: gpt-4o-mini             # openai/gpt-4o-mini

# Anthropic
model: claude-3-5-sonnet-20241022      # anthropic/claude-3-5-sonnet
model: anthropic/claude-3-opus-20240229

# Google AI
model: gemini/gemini-pro              # Google AI Studio
model: vertex_ai/gemini-pro           # Vertex AI

# Azure OpenAI
model: azure/gpt-4                    # Requires azure config

# AWS Bedrock
model: bedrock/anthropic.claude-3-sonnet-20240229-v1:0

# Ollama (local)
model: ollama/llama2                  # Requires Ollama running

# Hugging Face
model: huggingface/mistralai/Mistral-7B-Instruct-v0.2

# OpenRouter
model: openrouter/anthropic/claude-3.5-sonnet

# Together AI
model: together_ai/meta-llama/Llama-3-70b-chat-hf

# Full list: https://docs.litellm.ai/docs/providers
```

---

## Advanced Features

### 1. Load Balancing

Distribute requests across multiple providers or API keys:

```yaml
# litellm_config.yaml
model_list:
  # Load balance across multiple OpenAI keys
  - model_name: gpt-4-loadbalanced
    litellm_params:
      model: gpt-4
      api_key: sk-key-1...

  - model_name: gpt-4-loadbalanced
    litellm_params:
      model: gpt-4
      api_key: sk-key-2...

  - model_name: gpt-4-loadbalanced
    litellm_params:
      model: gpt-4
      api_key: sk-key-3...

router_settings:
  routing_strategy: simple-shuffle # Round-robin across keys
  # or: least-busy, usage-based-routing, latency-based-routing
```

Usage with NeuroLink:

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "openai-compatible",
      config: {
        baseUrl: "http://localhost:8000",
        apiKey: "sk-1234",
      },
    },
  ],
});

// Requests automatically balanced across all 3 API keys
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "openai-compatible",
  model: "gpt-4-loadbalanced",
});
```

### 2. Automatic Failover

Configure fallback providers for reliability:

```yaml
# litellm_config.yaml
model_list:
  # Primary: OpenAI
  - model_name: smart-model
    litellm_params:
      model: gpt-4
      api_key: sk-...

  # Fallback 1: Anthropic
  - model_name: smart-model
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: sk-ant-...

  # Fallback 2: Google
  - model_name: smart-model
    litellm_params:
      model: gemini/gemini-pro
      api_key: AIza...

router_settings:
  enable_fallbacks: true
  fallback_timeout: 30 # Seconds before trying fallback
  num_retries: 2
```

### 3. Budget Management

Set spending limits per user/team:

```yaml
# litellm_config.yaml
general_settings:
  master_key: sk-1234
  database_url: "postgresql://..." # Required for budgets

# Create virtual keys with budgets
# litellm --config config.yaml --create_key \
#   --key_name "team-frontend" \
#   --budget 100  # $100 limit
```

Track spending:

```python
# Check budget status
import litellm
budget_info = litellm.get_budget(api_key="sk-team-frontend-...")
print(f"Spent: ${budget_info['total_spend']}")
print(f"Budget: ${budget_info['max_budget']}")
```

### 4. Rate Limiting

Control request rates per user/model:

```yaml
# litellm_config.yaml
model_list:
  - model_name: gpt-4-limited
    litellm_params:
      model: gpt-4
      api_key: sk-...
    model_info:
      max_parallel_requests: 10 # Max concurrent requests
      max_requests_per_minute: 100 # RPM limit
      max_tokens_per_minute: 100000 # TPM limit
```

### 5. Caching

Reduce costs by caching responses:

```yaml
# litellm_config.yaml
general_settings:
  cache: true
  cache_params:
    type: redis
    host: localhost
    port: 6379
    ttl: 3600 # Cache for 1 hour
```

Usage:

```typescript
// Identical requests within TTL return cached results
const result1 = await ai.generate({
  input: { text: "What is AI?" },
  provider: "openai-compatible",
  model: "gpt-4",
});
// Cost: $0.03

const result2 = await ai.generate({
  input: { text: "What is AI?" }, // Same query
  provider: "openai-compatible",
  model: "gpt-4",
});
// Cost: $0.00 (cached)
```

### 6. Virtual Keys (Team Management)

Create team-specific API keys with permissions:

```bash
# Create key for frontend team with budget
litellm --config config.yaml --create_key \
  --key_name "team-frontend" \
  --budget 100 \
  --models "gpt-4,claude-3-5-sonnet"

# Create key for backend team
litellm --config config.yaml --create_key \
  --key_name "team-backend" \
  --budget 500 \
  --models "gpt-4,gpt-4o-mini,claude-3-5-sonnet"

# Returns: sk-litellm-team-frontend-abc123...
```

Teams use their virtual key:

```bash
OPENAI_COMPATIBLE_API_KEY=sk-litellm-team-frontend-abc123
```

---

## NeuroLink Integration

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    {
      name: "openai-compatible",
      config: {
        baseUrl: "http://localhost:8000", // LiteLLM proxy
        apiKey: process.env.LITELLM_KEY, // Master key or virtual key
      },
    },
  ],
});

// Use any provider through LiteLLM
const result = await ai.generate({
  input: { text: "Hello!" },
  provider: "openai-compatible",
  model: "gpt-4",
});
```

### Multi-Model Workflow

```typescript
// Easy switching between providers via LiteLLM
const models = {
  fast: "gpt-4o-mini",
  balanced: "claude-3-5-sonnet-20241022",
  powerful: "gpt-4",
};

async function generateSmart(
  prompt: string,
  complexity: "low" | "medium" | "high",
) {
  const modelMap = {
    low: models.fast,
    medium: models.balanced,
    high: models.powerful,
  };

  return await ai.generate({
    input: { text: prompt },
    provider: "openai-compatible",
    model: modelMap[complexity],
  });
}
```

### Cost Tracking

```typescript
// LiteLLM provides detailed cost tracking
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "openai-compatible",
  model: "gpt-4",
  enableAnalytics: true,
});

console.log("Model used:", result.model);
console.log("Tokens:", result.usage.totalTokens);
console.log("Cost:", result.cost); // Calculated by LiteLLM
```

---

## CLI Usage

### Basic Commands

```bash
# Start LiteLLM proxy
litellm --config litellm_config.yaml --port 8000

# Use via NeuroLink CLI
npx @juspay/neurolink generate "Hello LiteLLM" \
  --provider openai-compatible \
  --model "gpt-4"

# Switch models easily
npx @juspay/neurolink gen "Write code" \
  --provider openai-compatible \
  --model "claude-3-5-sonnet-20241022"

# Check proxy status
curl http://localhost:8000/health
```

### Proxy Management

```bash
# Create virtual key
litellm --config config.yaml --create_key \
  --key_name "my-team" \
  --budget 100

# List all keys
litellm --config config.yaml --list_keys

# Delete key
litellm --config config.yaml --delete_key \
  --key "sk-litellm-abc123..."

# View spend by key
litellm --config config.yaml --spend \
  --key "sk-litellm-abc123..."
```

---

## Production Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM ghcr.io/berriai/litellm:main-latest

COPY litellm_config.yaml /app/config.yaml

EXPOSE 8000

CMD ["litellm", "--config", "/app/config.yaml", "--port", "8000"]
```

```bash
# Build and run
docker build -t litellm-proxy .
docker run -p 8000:8000 litellm-proxy
```

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "8000:8000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    command: ["litellm", "--config", "/app/config.yaml", "--port", "8000"]
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/litellm
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=litellm
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Kubernetes Deployment

```yaml
# litellm-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: litellm-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: litellm
  template:
    metadata:
      labels:
        app: litellm
    spec:
      containers:
        - name: litellm
          image: ghcr.io/berriai/litellm:main-latest
          ports:
            - containerPort: 8000
          volumeMounts:
            - name: config
              mountPath: /app
          command: ["litellm", "--config", "/app/config.yaml", "--port", "8000"]
      volumes:
        - name: config
          configMap:
            name: litellm-config
---
apiVersion: v1
kind: Service
metadata:
  name: litellm-service
spec:
  selector:
    app: litellm
  ports:
    - port: 80
      targetPort: 8000
  type: LoadBalancer
```

### High Availability Setup

```yaml
# litellm_config.yaml - Production
model_list:
  # Multiple instances of each model
  - model_name: gpt-4-ha
    litellm_params:
      model: gpt-4
      api_key: sk-key-1...

  - model_name: gpt-4-ha
    litellm_params:
      model: gpt-4
      api_key: sk-key-2...

  - model_name: gpt-4-ha
    litellm_params:
      model: gpt-4
      api_key: sk-key-3...

general_settings:
  master_key: ${LITELLM_MASTER_KEY}
  database_url: ${DATABASE_URL}

  # Observability
  success_callback: ["langfuse", "prometheus"]
  failure_callback: ["sentry"]

  # Performance
  num_workers: 4
  cache: true
  cache_params:
    type: redis
    host: redis-cluster
    port: 6379

router_settings:
  routing_strategy: latency-based-routing
  enable_fallbacks: true
  num_retries: 3
  timeout: 30
  cooldown_time: 60
```

---

## Observability & Monitoring

### Logging

```yaml
# litellm_config.yaml
general_settings:
  success_callback: ["langfuse"] # Log successful requests
  failure_callback: ["sentry"] # Log failures

  # Langfuse integration for observability
  langfuse_public_key: ${LANGFUSE_PUBLIC_KEY}
  langfuse_secret_key: ${LANGFUSE_SECRET_KEY}
```

### Prometheus Metrics

```yaml
# litellm_config.yaml
general_settings:
  success_callback: ["prometheus"]
# Metrics available at http://localhost:8000/metrics
# - litellm_requests_total
# - litellm_request_duration_seconds
# - litellm_tokens_total
# - litellm_cost_total
```

### Custom Logging

```typescript
// Add custom metadata to requests
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "openai-compatible",
  model: "gpt-4",
  metadata: {
    user_id: "user-123",
    team: "frontend",
    environment: "production",
  },
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Connection refused"

**Problem**: LiteLLM proxy not running.

**Solution**:

```bash
# Check if proxy is running
curl http://localhost:8000/health

# Start proxy
litellm --config litellm_config.yaml --port 8000

# Check logs
litellm --config config.yaml --debug
```

#### 2. "Invalid API key"

**Problem**: Master key or virtual key incorrect.

**Solution**:

```bash
# Verify master_key in config
grep master_key litellm_config.yaml

# List all virtual keys
litellm --config config.yaml --list_keys

# Ensure key matches in .env
echo $OPENAI_COMPATIBLE_API_KEY
```

#### 3. "Budget exceeded"

**Problem**: Virtual key reached budget limit.

**Solution**:

```bash
# Check spend
litellm --config config.yaml --spend --key "sk-litellm-..."

# Increase budget
litellm --config config.yaml --update_key \
  --key "sk-litellm-..." \
  --budget 200
```

#### 4. "Model not found"

**Problem**: Model not configured in `model_list`.

**Solution**:

```yaml
# Add model to litellm_config.yaml
model_list:
  - model_name: your-model
    litellm_params:
      model: gpt-4
      api_key: sk-...

# Restart proxy
litellm --config litellm_config.yaml
```

---

## Best Practices

### 1. Use Virtual Keys

```yaml
# ✅ Good: Separate keys per team
# Team Frontend: sk-litellm-frontend-abc
# Team Backend: sk-litellm-backend-xyz
# Each with own budget and model access
```

### 2. Enable Fallbacks

```yaml
# ✅ Good: Configure fallback providers
router_settings:
  enable_fallbacks: true
  fallback_models: ["claude-3-5-sonnet-20241022", "gemini/gemini-pro"]
```

### 3. Implement Caching

```yaml
# ✅ Good: Cache frequent queries
general_settings:
  cache: true
  cache_params:
    ttl: 3600 # 1 hour
```

### 4. Monitor Costs

```yaml
# ✅ Good: Track spending
general_settings:
  success_callback: ["langfuse", "prometheus"]
# Set budgets per team
# Create alerts when budgets approach limits
```

### 5. Use Load Balancing

```yaml
# ✅ Good: Distribute load across providers
model_list:
  - model_name: production-model
    litellm_params:
      model: gpt-4
      api_key: sk-1...

  - model_name: production-model
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: sk-ant-...

router_settings:
  routing_strategy: usage-based-routing
```

---

## Related Documentation

- **[OpenAI Compatible Guide](./openai-compatible.md)** - OpenAI-compatible providers
- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce AI costs
- **[Load Balancing](../../guides/enterprise/load-balancing.md)** - Distribution strategies

---

## Additional Resources

- **[LiteLLM Documentation](https://docs.litellm.ai/)** - Official docs
- **[Supported Providers](https://docs.litellm.ai/docs/providers)** - 100+ providers list
- **[LiteLLM GitHub](https://github.com/BerriAI/litellm)** - Source code
- **[LiteLLM Proxy Docs](https://docs.litellm.ai/docs/proxy/quick_start)** - Proxy setup

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
