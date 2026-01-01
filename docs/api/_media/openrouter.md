---
title: OpenRouter Provider Guide
description: Access 300+ AI models from 60+ providers through OpenRouter's unified gateway with automatic failover and cost optimization
keywords: openrouter, multi-provider, model aggregator, cost optimization, ai models
---

# OpenRouter Provider Guide

**Access 300+ AI models from 60+ providers through a single unified API**

---

## Overview

OpenRouter is a unified gateway that provides access to 300+ AI models from 60+ providers through a single API. It automatically handles provider routing, failover, and cost optimization, making it the easiest way to access multiple AI models without managing individual provider integrations.

### Key Benefits

- **300+ Models**: Access models from Anthropic, OpenAI, Google, Meta, Mistral, and 55+ other providers
- **Automatic Failover**: Built-in redundancy - if one provider is down, requests automatically route to alternatives
- **Cost Optimization**: Competitive pricing with automatic routing to the most cost-effective providers
- **Zero Lock-in**: Switch between models and providers instantly without code changes
- **Privacy Options**: Choose between standard, moderated, or private routing modes
- **Usage Dashboard**: Track spending, model usage, and performance at https://openrouter.ai/activity
- **Free Models**: Access to free models for development and testing

### Use Cases

- **Multi-Model Applications**: Test and compare models from different providers
- **Cost Optimization**: Automatically route to the most cost-effective model for each task
- **High Availability**: Ensure your app stays online with automatic provider failover
- **Model Experimentation**: Easily experiment with cutting-edge models as they're released
- **Privacy-Conscious AI**: Use private routing to ensure data isn't logged or used for training
- **Development & Testing**: Use free models during development, switch to paid in production

---

## Quick Start

### 1. Get Your API Key

Sign up at [https://openrouter.ai](https://openrouter.ai) and get your API key from [https://openrouter.ai/keys](https://openrouter.ai/keys).

### 2. Configure Environment

Add your API key to `.env`:

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...

# Optional: Attribution (shows in OpenRouter dashboard)
OPENROUTER_REFERER=https://yourapp.com
OPENROUTER_APP_NAME="Your App Name"

# Optional: Override default model
OPENROUTER_MODEL=anthropic/claude-3-5-sonnet
```

### 3. Install NeuroLink

```bash
npm install @juspay/neurolink
# or
pnpm add @juspay/neurolink
```

### 4. Start Using OpenRouter

=== "SDK Usage"

    ```typescript
    import { NeuroLink } from "@juspay/neurolink";

    const ai = new NeuroLink({
      providers: [{
        name: "openrouter",
        config: {
          apiKey: process.env.OPENROUTER_API_KEY,
        },
      }],
    });

    // Use default model (Claude 3.5 Sonnet)
    const result = await ai.generate({
      input: { text: "What are the benefits of TypeScript?" },
    });

    console.log(result.content);
    ```

=== "CLI Usage"

    ```bash
    # Quick generation
    npx @juspay/neurolink generate "Hello from OpenRouter!" \
      --provider openrouter

    # Use specific model
    npx @juspay/neurolink gen "Write a haiku about AI" \
      --provider openrouter \
      --model "openai/gpt-4o"

    # Interactive loop mode
    npx @juspay/neurolink loop \
      --provider openrouter \
      --model "anthropic/claude-3-5-sonnet"
    ```

---

## Supported Models

OpenRouter provides access to 300+ models. Here are the most popular:

### Anthropic Claude

```typescript
// Latest models
"anthropic/claude-3-5-sonnet"; // Best overall - 200K context
"anthropic/claude-3-5-haiku"; // Fast & affordable - 200K context
"anthropic/claude-3-opus"; // Most capable - 200K context
```

### OpenAI

```typescript
// GPT-4 series
"openai/gpt-4o"; // Latest GPT-4 Omni
"openai/gpt-4o-mini"; // Fast & affordable GPT-4
"openai/gpt-4-turbo"; // GPT-4 Turbo
"openai/gpt-4"; // Original GPT-4

// GPT-3.5
"openai/gpt-3.5-turbo"; // Fast & cheap
```

### Google

```typescript
// Gemini models
"google/gemini-2.0-flash"; // Latest Gemini - 1M context
"google/gemini-1.5-pro"; // Gemini Pro - 1M context
"google/gemini-1.5-flash"; // Fast Gemini
```

### Meta Llama

```typescript
// Llama 3.1 series
"meta-llama/llama-3.1-405b-instruct"; // Largest open model
"meta-llama/llama-3.1-70b-instruct"; // Balanced performance
"meta-llama/llama-3.1-8b-instruct"; // Fast & efficient
```

### Mistral AI

```typescript
// Mistral models
"mistralai/mistral-large"; // Most capable Mistral
"mistralai/mixtral-8x22b-instruct"; // Large MoE model
"mistralai/mixtral-8x7b-instruct"; // Efficient MoE
```

### Free Models

OpenRouter provides free access to select models:

```typescript
// Popular free models
"google/gemini-2.0-flash-exp:free";
"meta-llama/llama-3.1-8b-instruct:free";
"microsoft/phi-3-medium-128k-instruct:free";
```

### Browse All Models

- **Web Dashboard**: [https://openrouter.ai/models](https://openrouter.ai/models)
- **API**: Dynamically fetched via `provider.getAvailableModels()`

---

## Model Selection Guide

### By Use Case

| Use Case                | Recommended Model                   | Why                                         |
| ----------------------- | ----------------------------------- | ------------------------------------------- |
| **General Chat**        | `anthropic/claude-3-5-sonnet`       | Best balance of quality, speed, and cost    |
| **Code Generation**     | `openai/gpt-4o`                     | Excellent code understanding and generation |
| **Long Documents**      | `google/gemini-1.5-pro`             | 1M token context window                     |
| **Fast Responses**      | `anthropic/claude-3-5-haiku`        | Ultra-fast with good quality                |
| **Cost Optimization**   | `openai/gpt-4o-mini`                | Cheapest GPT-4 class model                  |
| **Development/Testing** | `google/gemini-2.0-flash-exp:free`  | Free tier available                         |
| **Open Source**         | `meta-llama/llama-3.1-70b-instruct` | Best open source model                      |
| **Reasoning**           | `anthropic/claude-3-opus`           | Superior reasoning capabilities             |

### By Performance Characteristics

#### Speed Priority

```typescript
// Fastest models (< 1s response time)
"anthropic/claude-3-5-haiku"; // 25K tokens/sec
"google/gemini-2.0-flash"; // 20K tokens/sec
"openai/gpt-4o-mini"; // 18K tokens/sec
```

#### Quality Priority

```typescript
// Highest quality output
"anthropic/claude-3-opus"; // Best reasoning
"openai/gpt-4o"; // Best code
"google/gemini-1.5-pro"; // Best multimodal
```

#### Cost Priority

```typescript
// Most cost-effective
"openai/gpt-4o-mini"; // $0.15/1M tokens input
"anthropic/claude-3-5-haiku"; // $0.25/1M tokens input
"google/gemini-2.0-flash"; // $0.075/1M tokens input
```

---

## Best Practices

### 1. Model Selection Strategy

```typescript
// Use different models for different tasks
const ai = new NeuroLink({
  providers: [
    {
      name: "openrouter",
    },
  ],
});

// Fast model for simple tasks
async function quickTask(prompt: string) {
  return await ai.generate({
    input: { text: prompt },
    provider: "openrouter",
    model: "anthropic/claude-3-5-haiku", // Fast & cheap
  });
}

// Powerful model for complex tasks
async function complexTask(prompt: string) {
  return await ai.generate({
    input: { text: prompt },
    provider: "openrouter",
    model: "anthropic/claude-3-opus", // Most capable
  });
}

// Balanced model for general use
async function generalTask(prompt: string) {
  return await ai.generate({
    input: { text: prompt },
    provider: "openrouter",
    model: "anthropic/claude-3-5-sonnet", // Balanced
  });
}
```

### 2. Cost Optimization

```typescript
// Track costs with analytics
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "openrouter",
  model: "openai/gpt-4o-mini", // Cost-effective choice
  enableAnalytics: true,
});

console.log("Cost:", result.analytics?.cost);
console.log("Tokens:", result.analytics?.tokens.total);

// Set budget alerts in your code
const MAX_DAILY_COST = 10.0; // $10/day
let dailyCost = 0;

async function generateWithBudget(prompt: string) {
  if (dailyCost >= MAX_DAILY_COST) {
    throw new Error("Daily budget exceeded");
  }

  const result = await ai.generate({
    input: { text: prompt },
    enableAnalytics: true,
  });

  dailyCost += result.analytics?.cost || 0;
  return result;
}
```

### 3. Rate Limiting Awareness

OpenRouter has rate limits based on your account tier:

```typescript
// Implement exponential backoff for rate limits
async function generateWithRetry(
  prompt: string,
  maxRetries = 3,
  baseDelay = 1000,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.generate({
        input: { text: prompt },
        provider: "openrouter",
      });
    } catch (error) {
      if (error.message.includes("rate limit") && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Rate limited, waiting ${delay}ms before retry ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### 4. Error Handling Patterns

```typescript
// Comprehensive error handling
async function generateSafely(prompt: string) {
  try {
    return await ai.generate({
      input: { text: prompt },
      provider: "openrouter",
    });
  } catch (error) {
    if (error.message.includes("rate limit")) {
      // Handle rate limiting - wait and retry
      console.log("Rate limited, implementing backoff...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return generateSafely(prompt); // Retry
    } else if (error.message.includes("insufficient_credits")) {
      // Handle insufficient credits
      console.error(
        "Out of credits! Add more at https://openrouter.ai/credits",
      );
      throw new Error("Please add credits to continue");
    } else if (
      error.message.includes("model") &&
      error.message.includes("not found")
    ) {
      // Handle model not available - fallback to different model
      console.log("Model unavailable, falling back to default");
      return await ai.generate({
        input: { text: prompt },
        provider: "openrouter",
        model: "anthropic/claude-3-5-sonnet", // Reliable fallback
      });
    } else {
      // Unknown error - log and rethrow
      console.error("OpenRouter error:", error.message);
      throw error;
    }
  }
}
```

### 5. Caching Strategies

```typescript
// Implement response caching to reduce costs
import { createHash } from "crypto";

const responseCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

async function generateWithCache(prompt: string) {
  // Create cache key from prompt
  const cacheKey = createHash("sha256").update(prompt).digest("hex");

  // Check cache
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("Cache hit - saved API call!");
    return { content: cached.content, cached: true };
  }

  // Generate fresh response
  const result = await ai.generate({
    input: { text: prompt },
    provider: "openrouter",
  });

  // Cache the response
  responseCache.set(cacheKey, {
    content: result.content,
    timestamp: Date.now(),
  });

  return { content: result.content, cached: false };
}
```

### 6. Production Deployment Tips

```typescript
// Production-ready configuration
const ai = new NeuroLink({
  providers: [
    {
      name: "openrouter",
      config: {
        apiKey: process.env.OPENROUTER_API_KEY,
        // Attribution for OpenRouter dashboard
        referer: process.env.OPENROUTER_REFERER,
        appName: process.env.OPENROUTER_APP_NAME,
      },
    },
  ],
  // Enable analytics for monitoring
  enableAnalytics: true,
  // Set reasonable timeouts
  timeout: 30000, // 30 seconds
});

// Monitor performance
async function generateWithMonitoring(prompt: string) {
  const startTime = Date.now();

  try {
    const result = await ai.generate({
      input: { text: prompt },
      provider: "openrouter",
      enableAnalytics: true,
    });

    // Log performance metrics
    const duration = Date.now() - startTime;
    console.log("Generation metrics:", {
      duration,
      model: result.analytics?.model,
      tokens: result.analytics?.tokens.total,
      cost: result.analytics?.cost,
      tokensPerSecond: result.analytics?.tokens.total / (duration / 1000),
    });

    // Alert on slow responses
    if (duration > 10000) {
      console.warn(`Slow response: ${duration}ms`);
    }

    return result;
  } catch (error) {
    // Log errors to monitoring service
    console.error("Generation failed:", {
      prompt: prompt.substring(0, 100),
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}
```

---

## Advanced Features

### 1. Dynamic Model Discovery

```typescript
// Get all available models at runtime
const provider = await ai.getProvider("openrouter");
const models = await provider.getAvailableModels();

console.log(`${models.length} models available`);
console.log("Sample models:", models.slice(0, 10));

// Filter models by provider
const claudeModels = models.filter((m) => m.startsWith("anthropic/"));
const openaiModels = models.filter((m) => m.startsWith("openai/"));

console.log(`Claude models: ${claudeModels.length}`);
console.log(`OpenAI models: ${openaiModels.length}`);
```

### 2. Multi-Model Comparison

```typescript
// Compare outputs from different models
async function compareModels(prompt: string) {
  const models = [
    "anthropic/claude-3-5-sonnet",
    "openai/gpt-4o",
    "google/gemini-1.5-pro",
  ];

  const results = await Promise.all(
    models.map(async (model) => {
      const result = await ai.generate({
        input: { text: prompt },
        provider: "openrouter",
        model,
        enableAnalytics: true,
      });

      return {
        model,
        content: result.content,
        cost: result.analytics?.cost,
        tokens: result.analytics?.tokens.total,
        time: result.analytics?.responseTime,
      };
    }),
  );

  // Analyze results
  console.table(results);
  return results;
}
```

### 3. Attribution Tracking

```typescript
// Track usage in OpenRouter dashboard with custom attribution
const ai = new NeuroLink({
  providers: [
    {
      name: "openrouter",
      config: {
        apiKey: process.env.OPENROUTER_API_KEY,
        // Shows up on openrouter.ai/activity dashboard
        referer: "https://myapp.com",
        appName: "My AI Application",
      },
    },
  ],
});

// All requests will show attribution in dashboard
const result = await ai.generate({
  input: { text: "Hello!" },
});
```

### 4. Privacy Modes

OpenRouter supports different privacy modes through model suffixes:

```typescript
// Standard routing (default)
"anthropic/claude-3-5-sonnet";

// Moderated (filtered for safety)
"anthropic/claude-3-5-sonnet:moderated";

// Extended (longer timeout for large requests)
"anthropic/claude-3-5-sonnet:extended";

// Free tier (when available)
"google/gemini-2.0-flash-exp:free";
```

---

## CLI Usage

### Basic Commands

```bash
# Use default model
npx @juspay/neurolink generate "Hello OpenRouter" \
  --provider openrouter

# Specify model
npx @juspay/neurolink gen "Write code" \
  --provider openrouter \
  --model "openai/gpt-4o"

# Interactive loop mode
npx @juspay/neurolink loop \
  --provider openrouter \
  --model "anthropic/claude-3-5-sonnet"

# With temperature control
npx @juspay/neurolink gen "Be creative" \
  --provider openrouter \
  --temperature 0.9

# With max tokens
npx @juspay/neurolink gen "Write a long story" \
  --provider openrouter \
  --max-tokens 2000
```

### Model Comparison via CLI

```bash
# Compare different models
for model in "anthropic/claude-3-5-sonnet" "openai/gpt-4o" "google/gemini-1.5-pro"; do
  echo "Testing $model:"
  npx @juspay/neurolink gen "What is AI?" \
    --provider openrouter \
    --model "$model"
  echo "---"
done
```

---

## Pricing & Cost Management

### Understanding Costs

OpenRouter charges per token with transparent pricing:

- **Input tokens**: Cost to process your prompt
- **Output tokens**: Cost to generate the response
- **Caching**: Some models support prompt caching to reduce costs

View current pricing at [https://openrouter.ai/models](https://openrouter.ai/models)

### Cost Comparison (Approximate)

| Model                         | Input (per 1M tokens) | Output (per 1M tokens) | Best For          |
| ----------------------------- | --------------------- | ---------------------- | ----------------- |
| `openai/gpt-4o-mini`          | $0.15                 | $0.60                  | Cost optimization |
| `google/gemini-2.0-flash`     | $0.075                | $0.30                  | Fast & cheap      |
| `anthropic/claude-3-5-haiku`  | $0.25                 | $1.25                  | Speed & value     |
| `anthropic/claude-3-5-sonnet` | $3.00                 | $15.00                 | Balanced          |
| `openai/gpt-4o`               | $2.50                 | $10.00                 | Code generation   |
| `anthropic/claude-3-opus`     | $15.00                | $75.00                 | Complex reasoning |

### Managing Your Budget

```typescript
// Track spending across requests
class BudgetTracker {
  private totalSpent = 0;
  private dailyLimit = 50.0; // $50/day

  async generate(prompt: string) {
    if (this.totalSpent >= this.dailyLimit) {
      throw new Error(`Daily budget of $${this.dailyLimit} exceeded`);
    }

    const result = await ai.generate({
      input: { text: prompt },
      provider: "openrouter",
      enableAnalytics: true,
    });

    this.totalSpent += result.analytics?.cost || 0;

    console.log(`Spent: $${this.totalSpent.toFixed(4)} / $${this.dailyLimit}`);

    return result;
  }

  reset() {
    this.totalSpent = 0;
  }
}

const tracker = new BudgetTracker();
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid API key"

**Problem**: API key not set or incorrect.

**Solution**:

```bash
# Check if key is set
echo $OPENROUTER_API_KEY

# Get your key at https://openrouter.ai/keys
export OPENROUTER_API_KEY=sk-or-v1-...

# Add to .env file
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env
```

#### 2. "Rate limit exceeded"

**Problem**: Too many requests in a short time.

**Solution**:

- Implement exponential backoff (see Best Practices above)
- Upgrade your account at https://openrouter.ai/credits
- Reduce request frequency
- Use response caching

#### 3. "Insufficient credits"

**Problem**: Account balance is too low.

**Solution**:

```bash
# Check balance at https://openrouter.ai/credits
# Add credits to your account
# Set up auto-recharge for uninterrupted service
```

#### 4. "Model not found"

**Problem**: Model name is incorrect or unavailable.

**Solution**:

```bash
# Check available models
npx @juspay/neurolink models --provider openrouter

# Or visit https://openrouter.ai/models
# Use exact model ID format: "provider/model-name"
```

#### 5. "Request timeout"

**Problem**: Request took too long.

**Solution**:

```typescript
// Increase timeout
const result = await ai.generate({
  input: { text: "Long task..." },
  provider: "openrouter",
  timeout: 60000, // 60 seconds
});

// Or use extended model variant
const result = await ai.generate({
  input: { text: "Long task..." },
  provider: "openrouter",
  model: "anthropic/claude-3-5-sonnet:extended",
});
```

---

## Comparison with Other Providers

### OpenRouter vs Direct Provider Access

| Feature          | OpenRouter                 | Direct Provider          |
| ---------------- | -------------------------- | ------------------------ |
| **Model Access** | 300+ models, 60+ providers | Single provider's models |
| **Setup**        | One API key                | Multiple API keys        |
| **Failover**     | Automatic                  | Manual implementation    |
| **Pricing**      | Competitive, transparent   | Varies by provider       |
| **Rate Limits**  | Unified limits             | Provider-specific        |
| **Dashboard**    | Centralized tracking       | Separate dashboards      |
| **Switching**    | Instant (same API)         | Code changes required    |

### When to Use OpenRouter

**Use OpenRouter when:**

- You want to experiment with multiple models
- You need automatic failover for high availability
- You want simplified billing across providers
- You're building multi-model applications
- You want to avoid vendor lock-in

**Use Direct Providers when:**

- You only need one specific model
- You need provider-specific features (e.g., AWS Bedrock's VPC integration)
- You have existing provider integrations
- Your organization has enterprise agreements with specific providers

---

## Related Documentation

- **[LiteLLM Provider](./litellm.md)** - Alternative multi-provider solution
- **[OpenAI Compatible](./openai-compatible.md)** - OpenAI-compatible endpoints
- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[Cost Optimization Guide](../../guides/enterprise/cost-optimization.md)** - Reduce AI costs

---

## Additional Resources

- **[OpenRouter Website](https://openrouter.ai)** - Main website
- **[OpenRouter Models](https://openrouter.ai/models)** - Browse all models
- **[OpenRouter Dashboard](https://openrouter.ai/activity)** - Usage tracking
- **[OpenRouter Docs](https://openrouter.ai/docs)** - Official documentation
- **[OpenRouter API Reference](https://openrouter.ai/docs/api-reference)** - API docs

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
