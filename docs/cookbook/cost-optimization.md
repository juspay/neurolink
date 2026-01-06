# Cost Optimization

## Problem

AI API costs can accumulate quickly, especially with:

- Large context windows
- Frequent API calls
- Expensive models (GPT-4, Claude Opus)
- Inefficient prompt engineering

## Solution

Implement cost optimization strategies:

1. Use cheaper models when appropriate
2. Minimize context size
3. Cache responses
4. Implement token counting
5. Use model routing based on complexity

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

type CostOptimizer = {
  maxTokens?: number;
  cacheResponses?: boolean;
  useSmartRouting?: boolean;
};

class CostEfficientNeuroLink {
  private neurolink: NeuroLink;
  private cache = new Map<string, any>();
  private tokenCosts = {
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
    "claude-3-opus": { input: 0.015, output: 0.075 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
    "claude-3-haiku": { input: 0.00025, output: 0.00125 },
    "gemini-pro": { input: 0.00025, output: 0.0005 },
  };

  constructor(options: CostOptimizer = {}) {
    this.neurolink = new NeuroLink();
  }

  /**
   * Route to cheaper model for simple queries
   */
  selectModel(
    prompt: string,
    forceModel?: string,
  ): {
    provider: string;
    model: string;
  } {
    if (forceModel) {
      return { provider: "openai", model: forceModel };
    }

    // Simple heuristics for model selection
    const isComplex =
      prompt.length > 500 ||
      prompt.includes("analyze") ||
      prompt.includes("complex") ||
      prompt.includes("reasoning");

    const requiresCreativity =
      prompt.includes("creative") ||
      prompt.includes("story") ||
      prompt.includes("poem");

    if (isComplex && requiresCreativity) {
      return { provider: "openai", model: "gpt-4" };
    }

    if (isComplex) {
      return { provider: "anthropic", model: "claude-3-sonnet-20240229" };
    }

    // Simple queries → cheapest model
    return { provider: "anthropic", model: "claude-3-haiku-20240307" };
  }

  /**
   * Generate cache key from prompt
   */
  private getCacheKey(prompt: string, model: string): string {
    const normalized = prompt.trim().toLowerCase();
    return `${model}:${normalized}`;
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number {
    const costs = this.tokenCosts[model as keyof typeof this.tokenCosts];
    if (!costs) return 0;

    return (
      (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output
    );
  }

  /**
   * Generate with cost optimization
   */
  async generateCostEffective(
    prompt: string,
    options: {
      useCache?: boolean;
      maxTokens?: number;
      forceModel?: string;
    } = {},
  ) {
    const { provider, model } = this.selectModel(prompt, options.forceModel);
    const cacheKey = this.getCacheKey(prompt, model);

    // Check cache first
    if (options.useCache !== false && this.cache.has(cacheKey)) {
      console.log("💰 Using cached response (cost: $0.00)");
      return this.cache.get(cacheKey);
    }

    // Truncate very long prompts
    const maxPromptLength = 2000;
    const truncatedPrompt =
      prompt.length > maxPromptLength
        ? prompt.slice(0, maxPromptLength) + "..."
        : prompt;

    const result = await this.neurolink.generate({
      input: { text: truncatedPrompt },
      provider,
      model,
      maxTokens: options.maxTokens || 500, // Limit output tokens
    });

    // Estimate and log cost
    const inputTokens = this.estimateTokens(truncatedPrompt);
    const outputTokens = this.estimateTokens(result.content);
    const cost = this.estimateCost(inputTokens, outputTokens, model);

    console.log(`💰 Cost estimate: $${cost.toFixed(4)} (${model})`);

    // Cache the response
    if (options.useCache !== false) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Batch similar requests to minimize overhead
   */
  async batchGenerate(prompts: string[]) {
    const results = [];
    let totalCost = 0;

    for (const prompt of prompts) {
      const result = await this.generateCostEffective(prompt, {
        useCache: true,
      });
      results.push(result);

      // Track cumulative cost
      const cost = (this.estimateTokens(result.content) * 0.002) / 1000;
      totalCost += cost;
    }

    console.log(`\n💰 Total batch cost: $${totalCost.toFixed(4)}`);
    return results;
  }

  /**
   * Clear cache to free memory
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      estimatedSavings: this.cache.size * 0.01, // Rough estimate
    };
  }
}

// Usage Example
async function main() {
  const optimizer = new CostEfficientNeuroLink();

  // Simple query → uses cheap model (Haiku)
  const simple = await optimizer.generateCostEffective("What is 2+2?", {
    useCache: true,
  });
  console.log("Simple:", simple.content);

  // Complex query → uses better model (Sonnet)
  const complex = await optimizer.generateCostEffective(
    "Analyze the economic implications of quantum computing on financial markets",
    { maxTokens: 300 },
  );
  console.log("Complex:", complex.content);

  // Batch processing with caching
  const prompts = [
    "What is TypeScript?",
    "What is TypeScript?", // Cached!
    "Explain async/await",
  ];
  await optimizer.batchGenerate(prompts);

  // Check savings
  const stats = optimizer.getCacheStats();
  console.log(
    `\n📊 Cache stats: ${stats.entries} entries, ~$${stats.estimatedSavings.toFixed(2)} saved`,
  );
}

main();
```

## Explanation

### 1. Smart Model Routing

The `selectModel()` method analyzes the prompt to choose the most cost-effective model:

- **Simple queries** → Claude Haiku ($0.00025/1K input tokens)
- **Complex queries** → Claude Sonnet ($0.003/1K input tokens)
- **Complex + Creative** → GPT-4 ($0.03/1K input tokens)

### 2. Response Caching

Identical prompts return cached responses at zero cost. Perfect for:

- Repeated queries
- Development/testing
- Common questions in production

### 3. Token Limiting

Set `maxTokens` to prevent unexpectedly long (expensive) responses:

- Summaries: 200-300 tokens
- Explanations: 500-1000 tokens
- Creative content: 1000-2000 tokens

### 4. Cost Tracking

Estimate costs per request to monitor spending:

```
Input: 250 tokens × $0.003/1K = $0.00075
Output: 500 tokens × $0.015/1K = $0.00750
Total: $0.00825
```

### 5. Prompt Truncation

Very long prompts increase costs without adding value. Truncate to essential context.

## Variations

### Context Window Compression

Compress conversation history to reduce tokens:

```typescript
function compressContext(messages: Array<{ role: string; content: string }>) {
  // Keep system message and last N messages
  const system = messages.find((m) => m.role === "system");
  const recent = messages.slice(-5); // Last 5 messages

  // Summarize older messages
  const older = messages.slice(1, -5);
  const summary =
    older.length > 0
      ? `[Previous conversation: ${older.length} messages covering ${older.map((m) => m.content.slice(0, 20)).join(", ")}...]`
      : "";

  return [system, { role: "assistant", content: summary }, ...recent].filter(
    Boolean,
  );
}
```

### Model Tier System

Explicitly define cost tiers:

```typescript
enum ModelTier {
  ULTRA_CHEAP = "claude-3-haiku-20240307", // $0.00025/1K
  CHEAP = "gpt-3.5-turbo", // $0.0015/1K
  BALANCED = "claude-3-sonnet-20240229", // $0.003/1K
  POWERFUL = "gpt-4", // $0.03/1K
}

async function generateWithTier(prompt: string, tier: ModelTier) {
  return neurolink.generate({
    input: { text: prompt },
    model: tier,
  });
}
```

### Budget Enforcement

Set spending limits:

```typescript
class BudgetEnforcer {
  private spentToday = 0;
  private dailyLimit = 10.0; // $10/day

  async generate(neurolink: NeuroLink, prompt: string) {
    const estimatedCost = 0.01; // Rough estimate

    if (this.spentToday + estimatedCost > this.dailyLimit) {
      throw new Error(
        `Budget exceeded: $${this.spentToday.toFixed(2)}/$${this.dailyLimit}`,
      );
    }

    const result = await neurolink.generate({ input: { text: prompt } });
    this.spentToday += estimatedCost;

    return result;
  }
}
```

## Cost Comparison

| Task Type        | Best Model    | Cost (per 1K tokens) | Use Case                     |
| ---------------- | ------------- | -------------------- | ---------------------------- |
| Simple Q&A       | Claude Haiku  | $0.00025             | FAQs, basic queries          |
| Data extraction  | GPT-3.5 Turbo | $0.0015              | JSON parsing, classification |
| Analysis         | Claude Sonnet | $0.003               | Summaries, explanations      |
| Deep reasoning   | GPT-4         | $0.03                | Complex problem-solving      |
| Creative writing | GPT-4         | $0.03                | Stories, marketing copy      |

## See Also

- [Batch Processing](batch-processing.md)
- [Context Window Management](context-window-management.md)
- [Provider Selection Guide](../guides/provider-selection.md)
- [Rate Limit Handling](rate-limit-handling.md)
