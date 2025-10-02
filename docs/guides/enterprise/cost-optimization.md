---
title: Cost Optimization Guide
description: Reduce AI costs by 80-95% with intelligent routing, caching, and free tier strategies
keywords: cost optimization, savings, free tier, caching, intelligent routing
---

# Cost Optimization Guide

**Reduce AI costs by 80-95% through smart provider selection, caching, and optimization strategies**

---

## Overview

AI API costs can quickly escalate in production. This guide shows proven strategies to dramatically reduce AI spending while maintaining quality and performance. Learn how to leverage free tiers, choose cost-effective models, implement caching, and optimize token usage.

### Potential Savings

| Strategy               | Typical Savings | Complexity |
| ---------------------- | --------------- | ---------- |
| **Free Tier First**    | 80-100%         | Low        |
| **Model Selection**    | 50-90%          | Low        |
| **Response Caching**   | 60-95%          | Medium     |
| **Token Optimization** | 20-40%          | Medium     |
| **Prompt Compression** | 15-30%          | Medium     |
| **Smart Fallbacks**    | 30-60%          | High       |
| **Batch Processing**   | 50%             | Medium     |

### Cost Comparison

```
Monthly Cost Comparison (1M requests, 500 tokens avg):

Premium (GPT-4):           $6,000/month
Smart Routing:             $1,200/month  (80% savings)
Free Tier First:           $300/month    (95% savings)
Full Optimization:         $150/month    (97.5% savings)
```

---

## Quick Wins

### 1. Use Free Tiers First

Maximize free tier usage before falling back to paid providers.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    // Tier 1: Free providers (try these first)
    {
      name: "google-ai",
      priority: 1,
      model: "gemini-2.0-flash",
      config: { apiKey: process.env.GOOGLE_AI_KEY },
      quotas: {
        daily: 1500, // 1,500 requests/day free
        perMinute: 15, // 15 RPM free
      },
    },

    // Tier 2: Cheap paid providers
    {
      name: "openai",
      priority: 2,
      model: "gpt-4o-mini",
      config: { apiKey: process.env.OPENAI_KEY },
      costPer1M: 150, // $0.15/1K tokens
    },

    // Tier 3: Premium (only when necessary)
    {
      name: "anthropic",
      priority: 3,
      model: "claude-3-5-sonnet-20241022",
      config: { apiKey: process.env.ANTHROPIC_KEY },
      costPer1M: 3000, // $3/1K tokens
    },
  ],
  failoverConfig: {
    enabled: true,
    fallbackOnQuota: true, // Auto-failover when quota exhausted
  },
});

// Automatically uses cheapest available provider
const result = await ai.generate({
  input: { text: "Your prompt" },
});

console.log(`Used: ${result.provider}, Cost: $${result.cost}`);
```

**Estimated Monthly Savings:**

```
Before: 1M requests × $3/1K tokens = $1,500/month
After:  900K free + 100K paid × $0.15/1K = $15/month
Savings: $1,485/month (99% reduction)
```

### 2. Choose Cost-Effective Models

Use cheaper models for simple tasks, premium only when needed.

```typescript
function selectModel(task: string): { provider: string; model: string } {
  const complexity = analyzeComplexity(task);

  if (complexity === "simple") {
    return {
      provider: "google-ai",
      model: "gemini-2.0-flash", // Free
    };
  } else if (complexity === "medium") {
    return {
      provider: "openai",
      model: "gpt-4o-mini", // $0.15/1K
    };
  } else {
    return {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022", // $3/1K
    };
  }
}

function analyzeComplexity(task: string): "simple" | "medium" | "complex" {
  const length = task.length;
  const keywords = /analyze|complex|detailed|comprehensive/i;

  if (length < 100 && !keywords.test(task)) return "simple";
  if (length < 500 && !keywords.test(task)) return "medium";
  return "complex";
}

// Usage
const { provider, model } = selectModel("What is 2+2?"); // → google-ai (free)
const result = await ai.generate({
  input: { text: "What is 2+2?" },
  provider,
  model,
});
```

**Cost Comparison:**

```
Simple query (100 tokens):
- GPT-4:           $0.0003
- GPT-4o-mini:     $0.00001
- Gemini Flash:    $0
Savings: 100% vs GPT-4

Complex query (2000 tokens):
- GPT-4:           $0.006
- Claude Sonnet:   $0.006
- GPT-4o-mini:     $0.0003
Savings: 95% for tasks where mini performs well
```

### 3. Implement Response Caching

Cache common queries to avoid repeated API calls.

```typescript
import { createHash } from "crypto";

class ResponseCache {
  private cache = new Map<
    string,
    {
      response: any;
      timestamp: number;
      cost: number;
    }
  >();

  private TTL = 3600000; // 1 hour
  private totalSavings = 0;

  getCacheKey(input: any, provider: string, model: string): string {
    const hash = createHash("sha256");
    hash.update(JSON.stringify({ input, provider, model }));
    return hash.digest("hex");
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    // Track savings
    this.totalSavings += cached.cost;
    console.log(`Cache hit! Saved $${cached.cost.toFixed(4)}`);

    return cached.response;
  }

  set(key: string, response: any, cost: number) {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      cost,
    });
  }

  getSavings(): number {
    return this.totalSavings;
  }

  getStats() {
    return {
      entries: this.cache.size,
      totalSavings: this.totalSavings,
      avgCostPerEntry: this.totalSavings / this.cache.size,
    };
  }
}

// Usage
const cache = new ResponseCache();

async function cachedGenerate(prompt: string) {
  const cacheKey = cache.getCacheKey({ text: prompt }, "openai", "gpt-4o-mini");

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Generate fresh response
  const result = await ai.generate({
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o-mini",
    enableAnalytics: true,
  });

  // Store in cache
  cache.set(cacheKey, result, result.cost);

  return result;
}

// Check savings
setInterval(() => {
  console.log("Cache stats:", cache.getStats());
  // { entries: 523, totalSavings: 45.67, avgCostPerEntry: 0.087 }
}, 60000);
```

**Estimated Savings:**

```
Cache hit rate: 60% (common in production)
Monthly requests: 1M
Cost without cache: $150
Cost with cache:    $60 (40% of requests)
Savings: $90/month (60% reduction)
```

---

## Free Tier Optimization

### Google AI Studio (1,500 RPD Free)

```typescript
class GoogleAIQuotaManager {
  private requestsToday = 0;
  private dayStart = Date.now();

  async canUseFreeTier(): Promise<boolean> {
    // Reset daily counter
    if (Date.now() - this.dayStart > 86400000) {
      this.requestsToday = 0;
      this.dayStart = Date.now();
    }

    return this.requestsToday < 1450; // Buffer before limit
  }

  recordRequest() {
    this.requestsToday++;
  }

  getRemainingQuota(): number {
    return Math.max(0, 1500 - this.requestsToday);
  }
}

// Usage
const googleQuota = new GoogleAIQuotaManager();

const ai = new NeuroLink({
  providers: [
    {
      name: "google-ai",
      priority: 1,
      condition: async () => await googleQuota.canUseFreeTier(),
    },
    {
      name: "openai",
      priority: 2,
      model: "gpt-4o-mini", // Cheap fallback
    },
  ],
});
```

**Monthly Savings:**

```
1,500 requests/day × 30 days = 45,000 free requests
45,000 × 500 tokens × $0.15/1M = $3.37 saved/month
If 100% free tier: $0 cost
```

### Hugging Face (100% Free)

```typescript
// Use Hugging Face for zero-cost inference
const ai = new NeuroLink({
  providers: [
    {
      name: "huggingface",
      priority: 1,
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      config: { apiKey: process.env.HF_API_KEY }, // Free API key
      costPer1M: 0, // Completely free
    },
    {
      name: "openai",
      priority: 2,
      model: "gpt-4o-mini",
      costPer1M: 150, // Fallback when HF quality insufficient
    },
  ],
});

// For simple tasks, 100% free with Hugging Face
const simple = await ai.generate({
  input: { text: "Summarize: AI is transforming industries..." },
  // Uses Hugging Face (free)
});
```

---

## Token Optimization

### 1. Reduce Output Tokens

Limit response length to only what's needed.

```typescript
// ❌ Bad: No limit (can generate 1000s of tokens)
const wasteful = await ai.generate({
  input: { text: "List AI providers" },
  // Could generate 2000+ tokens
});

// ✅ Good: Set reasonable limit
const efficient = await ai.generate({
  input: { text: "List AI providers" },
  maxTokens: 200, // Only what's needed
});

// Savings per request:
// Before: 2000 tokens × $0.15/1M = $0.0003
// After:  200 tokens × $0.15/1M = $0.00003
// Savings: 90%
```

### 2. Optimize Prompts

Use concise prompts without sacrificing quality.

```typescript
// ❌ Bad: Verbose prompt (300 tokens)
const verbose = await ai.generate({
  input: {
    text: `
    I would like you to please help me understand what artificial intelligence
    is all about. Please provide a comprehensive explanation that covers the
    following topics in great detail: machine learning, deep learning, neural
    networks, natural language processing, and computer vision. Make sure to
    explain each concept thoroughly and provide examples where applicable.
  `,
  },
});

// ✅ Good: Concise prompt (50 tokens)
const concise = await ai.generate({
  input: {
    text: "Explain AI: ML, DL, neural networks, NLP, computer vision. Include examples.",
  },
});

// Savings per request:
// Before: 300 input + 500 output = 800 tokens × $0.15/1M = $0.00012
// After:  50 input + 500 output = 550 tokens × $0.15/1M = $0.0000825
// Savings: 31% on input tokens
```

### 3. Streaming Optimization

Stop generation early when answer is complete.

```typescript
async function streamWithEarlyStop(prompt: string, stopWords: string[]) {
  let fullResponse = "";
  let stopped = false;

  for await (const chunk of ai.stream({
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o-mini",
  })) {
    fullResponse += chunk.content;

    // Check for stop condition
    if (stopWords.some((word) => fullResponse.includes(word))) {
      await chunk.cancel(); // Stop generation
      stopped = true;
      break;
    }
  }

  console.log(`Stopped early: ${stopped}`);
  return fullResponse;
}

// Usage
const result = await streamWithEarlyStop(
  "List 10 programming languages",
  ["10."], // Stop after 10th item
);

// Potential savings: 20-40% by not generating unnecessary content
```

---

## Prompt Engineering for Cost

### Use Structured Outputs

Request specific formats to reduce token waste.

```typescript
// ❌ Bad: Unstructured (generates 500+ tokens)
const unstructured = await ai.generate({
  input: { text: "Tell me about AI providers" },
});
// Output: "There are many AI providers available today. Let me tell you about them in detail..."

// ✅ Good: Structured (generates 200 tokens)
const structured = await ai.generate({
  input: { text: "List AI providers in format: name|description|pricing" },
});
// Output: "OpenAI|GPT models|$0.002/1K\nAnthropic|Claude|$0.003/1K\n..."

// Savings: 60% fewer tokens
```

### Request Summaries

Ask for brief responses when detail isn't needed.

```typescript
// For detailed analysis
const detailed = await ai.generate({
  input: { text: "Provide detailed analysis of AI market trends (500 words)" },
  maxTokens: 700,
});
// Cost: $0.0001

// For quick insights
const summary = await ai.generate({
  input: { text: "AI market trends: 3 bullet points" },
  maxTokens: 100,
});
// Cost: $0.000015
// Savings: 85%
```

---

## Batch Processing

Process multiple requests in single API call.

```typescript
// ❌ Bad: 10 separate requests
const wasteful = await Promise.all([
  ai.generate({ input: { text: "Translate to French: Hello" } }),
  ai.generate({ input: { text: "Translate to French: Goodbye" } }),
  // ... 8 more requests
]);
// Cost: 10 × overhead + 10 × processing = high overhead

// ✅ Good: Batch into single request
const batch = await ai.generate({
  input: {
    text: `
    Translate to French:
    1. Hello
    2. Goodbye
    3. Thank you
    ... (10 items)
  `,
  },
  maxTokens: 200,
});
// Cost: 1 × overhead + batch processing = ~50% savings
```

**Batch Processing Pattern:**

```typescript
class BatchProcessor {
  private queue: Array<{
    prompt: string;
    resolve: (value: any) => void;
  }> = [];

  private batchSize = 10;
  private batchTimeout = 1000; // 1 second
  private timer: NodeJS.Timeout | null = null;

  async add(prompt: string): Promise<any> {
    return new Promise((resolve) => {
      this.queue.push({ prompt, resolve });

      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }

  private async processBatch() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = this.queue.splice(0, this.batchSize);
    if (batch.length === 0) return;

    // Combine prompts
    const combinedPrompt = batch
      .map((item, i) => `${i + 1}. ${item.prompt}`)
      .join("\n");

    // Single API call
    const result = await ai.generate({
      input: { text: `Answer each question:\n${combinedPrompt}` },
    });

    // Parse and distribute responses
    const responses = result.content.split("\n");
    batch.forEach((item, i) => {
      item.resolve(responses[i]);
    });
  }
}

// Usage
const batcher = new BatchProcessor();

// These get batched into single request
const results = await Promise.all([
  batcher.add("What is AI?"),
  batcher.add("What is ML?"),
  batcher.add("What is DL?"),
]);
```

---

## Smart Routing Patterns

### Cost-Based Routing

```typescript
const ai = new NeuroLink({
  providers: [
    // Route simple queries to free tier
    {
      name: "google-ai",
      priority: 1,
      model: "gemini-2.0-flash",
      condition: (req) => req.complexity === "low",
      costPer1M: 0,
    },

    // Medium complexity → cheap paid
    {
      name: "openai",
      priority: 1,
      model: "gpt-4o-mini",
      condition: (req) => req.complexity === "medium",
      costPer1M: 150,
    },

    // Complex → premium only when necessary
    {
      name: "anthropic",
      priority: 1,
      model: "claude-3-5-sonnet-20241022",
      condition: (req) => req.complexity === "high",
      costPer1M: 3000,
    },
  ],
});

// Classify and route
function classifyComplexity(prompt: string): "low" | "medium" | "high" {
  const length = prompt.length;
  const complexWords = ["analyze", "detailed", "comprehensive", "complex"];
  const hasComplexWords = complexWords.some((w) =>
    prompt.toLowerCase().includes(w),
  );

  if (length < 100 && !hasComplexWords) return "low"; // Free tier
  if (length < 500 || !hasComplexWords) return "medium"; // Cheap paid
  return "high"; // Premium
}

// Usage
const result = await ai.generate({
  input: { text: "What is 2+2?" },
  metadata: { complexity: classifyComplexity("What is 2+2?") },
  // Routes to google-ai (free) → $0 cost
});
```

**Monthly Savings:**

```
Request distribution:
- 70% simple (free tier):     700K × $0 = $0
- 20% medium (cheap):          200K × $0.15/1K = $30
- 10% complex (premium):       100K × $3/1K = $300
Total: $330/month

Without routing (all premium):
- 100% premium:                1M × $3/1K = $3,000
Savings: $2,670/month (89% reduction)
```

---

## Monitoring and Budgets

### Cost Tracking

```typescript
class CostTracker {
  private dailyCost = 0;
  private monthlyCost = 0;
  private dayStart = Date.now();
  private monthStart = Date.now();

  private budget = {
    daily: 10, // $10/day
    monthly: 250, // $250/month
  };

  recordCost(cost: number, provider: string, model: string) {
    const now = Date.now();

    // Reset daily
    if (now - this.dayStart > 86400000) {
      console.log(`Daily cost: $${this.dailyCost.toFixed(2)}`);
      this.dailyCost = 0;
      this.dayStart = now;
    }

    // Reset monthly
    if (now - this.monthStart > 2592000000) {
      // 30 days
      console.log(`Monthly cost: $${this.monthlyCost.toFixed(2)}`);
      this.monthlyCost = 0;
      this.monthStart = now;
    }

    this.dailyCost += cost;
    this.monthlyCost += cost;

    // Check budgets
    if (this.dailyCost > this.budget.daily) {
      throw new Error(
        `Daily budget exceeded: $${this.dailyCost.toFixed(2)} > $${this.budget.daily}`,
      );
    }

    if (this.monthlyCost > this.budget.monthly) {
      throw new Error(
        `Monthly budget exceeded: $${this.monthlyCost.toFixed(2)} > $${this.budget.monthly}`,
      );
    }

    console.log(
      `Cost: $${cost.toFixed(4)} (${provider}/${model}), Daily: $${this.dailyCost.toFixed(2)}, Monthly: $${this.monthlyCost.toFixed(2)}`,
    );
  }

  getStatus() {
    return {
      daily: {
        spent: this.dailyCost,
        budget: this.budget.daily,
        remaining: this.budget.daily - this.dailyCost,
        percentUsed: (this.dailyCost / this.budget.daily) * 100,
      },
      monthly: {
        spent: this.monthlyCost,
        budget: this.budget.monthly,
        remaining: this.budget.monthly - this.monthlyCost,
        percentUsed: (this.monthlyCost / this.budget.monthly) * 100,
      },
    };
  }
}

// Usage
const costTracker = new CostTracker();

const result = await ai.generate({
  input: { text: "Your prompt" },
  enableAnalytics: true,
});

costTracker.recordCost(result.cost, result.provider, result.model);

// Check status
console.log(costTracker.getStatus());
/*
{
  daily: { spent: 2.45, budget: 10, remaining: 7.55, percentUsed: 24.5 },
  monthly: { spent: 45.23, budget: 250, remaining: 204.77, percentUsed: 18.09 }
}
*/
```

---

## Best Practices

### 1. ✅ Free Tier First, Always

```typescript
// ✅ Always try free tier before paid
const ai = new NeuroLink({
  providers: [
    { name: "google-ai", priority: 1 }, // Free
    { name: "openai", priority: 2 }, // Paid fallback
  ],
});
```

### 2. ✅ Cache Aggressively

```typescript
// ✅ Cache frequent queries
const cache = new ResponseCache();
const result = await cachedGenerate(prompt);
// 60%+ hit rate = 60%+ savings
```

### 3. ✅ Limit Output Tokens

```typescript
// ✅ Always set maxTokens
const result = await ai.generate({
  input: { text: prompt },
  maxTokens: 200, // Only generate what's needed
});
```

### 4. ✅ Monitor Spending

```typescript
// ✅ Track costs in real-time
const costTracker = new CostTracker();
// Alert when approaching budget
```

### 5. ✅ Use Appropriate Models

```typescript
// ✅ Don't use GPT-4 for simple tasks
const simple = await ai.generate({
  input: { text: "What is 2+2?" },
  provider: "google-ai", // Free tier for simple query
  model: "gemini-2.0-flash",
});
```

---

## Complete Cost Optimization Stack

```typescript
// Production-ready cost-optimized setup
import { NeuroLink } from "@juspay/neurolink";
import { ResponseCache } from "./cache";
import { CostTracker } from "./tracking";
import { QuotaManager } from "./quotas";

const cache = new ResponseCache();
const costTracker = new CostTracker();
const quotaManager = new QuotaManager();

const ai = new NeuroLink({
  providers: [
    // Tier 1: Free (Google AI)
    {
      name: "google-ai",
      priority: 1,
      model: "gemini-2.0-flash",
      condition: async () => await quotaManager.canUseGoogleAI(),
      costPer1M: 0,
    },

    // Tier 2: Cheap (OpenAI Mini)
    {
      name: "openai",
      priority: 2,
      model: "gpt-4o-mini",
      costPer1M: 150,
    },

    // Tier 3: Premium (only when needed)
    {
      name: "anthropic",
      priority: 3,
      model: "claude-3-5-sonnet-20241022",
      condition: (req) => req.requiresPremium,
      costPer1M: 3000,
    },
  ],
  failoverConfig: { enabled: true },
  onSuccess: (result) => {
    costTracker.recordCost(result.cost, result.provider, result.model);
    quotaManager.recordUsage(result.provider, result.usage.totalTokens);
  },
});

// Main generation function with full optimization
async function optimizedGenerate(prompt: string, options: any = {}) {
  // 1. Check cache first
  const cacheKey = cache.getCacheKey(
    { text: prompt },
    options.provider,
    options.model,
  );
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log("Cache hit - $0 cost");
    return cached;
  }

  // 2. Optimize prompt
  const optimizedPrompt = optimizePrompt(prompt);

  // 3. Set reasonable max tokens
  const maxTokens = options.maxTokens || estimateNeededTokens(prompt);

  // 4. Generate with cost tracking
  const result = await ai.generate({
    input: { text: optimizedPrompt },
    maxTokens,
    enableAnalytics: true,
    ...options,
  });

  // 5. Cache result
  cache.set(cacheKey, result, result.cost);

  // 6. Log savings
  console.log(`Cost: $${result.cost.toFixed(4)}, Provider: ${result.provider}`);
  console.log(
    `Daily spend: $${costTracker.getStatus().daily.spent.toFixed(2)}`,
  );

  return result;
}

function optimizePrompt(prompt: string): string {
  // Remove excessive whitespace
  return prompt.replace(/\s+/g, " ").trim();
}

function estimateNeededTokens(prompt: string): number {
  // Simple heuristic: output ~2x input length
  const estimatedInput = prompt.length / 4; // ~4 chars per token
  return Math.min(estimatedInput * 2, 500); // Cap at 500
}
```

**Estimated Monthly Savings:**

```
Without optimization: $3,000/month
With full optimization: $150/month
Total savings: $2,850/month (95% reduction)
```

---

## Related Documentation

- **[Multi-Provider Failover](./multi-provider-failover.md)** - Automatic failover
- **[Load Balancing](./load-balancing.md)** - Distribution strategies
- **[Provider Setup](../../getting-started/provider-setup.md)** - Provider configuration
- **[Google AI Guide](../../getting-started/providers/google-ai.md)** - Free tier details

---

## Additional Resources

- **[OpenAI Pricing](https://openai.com/pricing)** - OpenAI costs
- **[Anthropic Pricing](https://www.anthropic.com/pricing)** - Claude costs
- **[Google AI Pricing](https://ai.google.dev/pricing)** - Gemini pricing
- **[LiteLLM Cost Tracking](https://docs.litellm.ai/docs/proxy/cost_tracking)** - Cost management

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
