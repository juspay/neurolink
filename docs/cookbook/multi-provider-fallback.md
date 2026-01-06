# Multi-Provider Fallback

## Problem

Relying on a single AI provider creates a single point of failure:

- Provider outages affect your entire application
- Rate limits halt all operations
- Regional availability issues block access
- Model deprecation requires code changes

## Solution

Implement automatic fallback across multiple providers:

1. Primary → Secondary → Tertiary provider chain
2. Health monitoring for each provider
3. Automatic failover on errors
4. Load balancing across providers
5. Cost-aware routing

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

type ProviderConfig = {
  name: string;
  model?: string;
  priority: number; // Lower = higher priority
  costPerToken?: number; // For cost-aware routing
  maxRetries?: number;
};

class MultiProviderNeuroLink {
  private neurolink: NeuroLink;
  private providers: ProviderConfig[];
  private healthStatus = new Map<string, boolean>();

  constructor(providers: ProviderConfig[]) {
    this.neurolink = new NeuroLink();
    this.providers = providers.sort((a, b) => a.priority - b.priority);

    // Initialize all providers as healthy
    providers.forEach((p) => this.healthStatus.set(p.name, true));
  }

  /**
   * Mark provider as unhealthy
   */
  private markUnhealthy(provider: string, duration: number = 60000) {
    console.log(`⚠️  Marking ${provider} as unhealthy for ${duration}ms`);
    this.healthStatus.set(provider, false);

    // Auto-recover after duration
    setTimeout(() => {
      console.log(`✅ ${provider} marked as healthy again`);
      this.healthStatus.set(provider, true);
    }, duration);
  }

  /**
   * Get healthy providers in priority order
   */
  private getHealthyProviders(): ProviderConfig[] {
    return this.providers.filter(
      (p) => this.healthStatus.get(p.name) !== false,
    );
  }

  /**
   * Generate with automatic fallback
   */
  async generate(
    prompt: string,
    options: { preferCheap?: boolean; timeout?: number } = {},
  ): Promise<{
    content: string;
    provider: string;
    attempts: number;
  }> {
    let providers = this.getHealthyProviders();

    if (providers.length === 0) {
      throw new Error("No healthy providers available");
    }

    // Sort by cost if preferred
    if (options.preferCheap) {
      providers = providers.sort(
        (a, b) => (a.costPerToken || 0) - (b.costPerToken || 0),
      );
    }

    let attempts = 0;
    const errors: Error[] = [];

    for (const config of providers) {
      attempts++;
      console.log(`\n🔄 Attempt ${attempts}: Trying ${config.name}...`);

      try {
        const result = await this.tryProvider(prompt, config, options.timeout);

        console.log(`✅ Success with ${config.name}`);

        return {
          content: result.content,
          provider: config.name,
          attempts,
        };
      } catch (error: any) {
        console.error(`❌ ${config.name} failed:`, error.message);
        errors.push(error);

        // Mark unhealthy if specific error types
        if (this.shouldMarkUnhealthy(error)) {
          this.markUnhealthy(config.name);
        }

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(
      `All ${attempts} providers failed:\n${errors
        .map((e, i) => `${i + 1}. ${e.message}`)
        .join("\n")}`,
    );
  }

  /**
   * Try a specific provider
   */
  private async tryProvider(
    prompt: string,
    config: ProviderConfig,
    timeout: number = 30000,
  ) {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout),
    );

    const generatePromise = this.neurolink.generate({
      input: { text: prompt },
      provider: config.name,
      model: config.model,
    });

    return Promise.race([generatePromise, timeoutPromise]);
  }

  /**
   * Determine if error should mark provider unhealthy
   */
  private shouldMarkUnhealthy(error: any): boolean {
    return (
      error.status === 503 || // Service unavailable
      error.status === 502 || // Bad gateway
      error.code === "ECONNREFUSED" ||
      error.message?.includes("overloaded") ||
      error.message?.includes("capacity")
    );
  }

  /**
   * Stream with fallback
   */
  async stream(prompt: string): Promise<{
    stream: AsyncIterable<any>;
    provider: string;
  }> {
    const providers = this.getHealthyProviders();

    for (const config of providers) {
      try {
        console.log(`🔄 Trying to stream with ${config.name}...`);

        const stream = await this.neurolink.stream({
          input: { text: prompt },
          provider: config.name,
          model: config.model,
        });

        return {
          stream,
          provider: config.name,
        };
      } catch (error: any) {
        console.error(`❌ ${config.name} streaming failed:`, error.message);

        if (this.shouldMarkUnhealthy(error)) {
          this.markUnhealthy(config.name);
        }

        continue;
      }
    }

    throw new Error("All providers failed to stream");
  }

  /**
   * Get provider health status
   */
  getHealthStatus() {
    return Array.from(this.healthStatus.entries()).map(([name, healthy]) => ({
      provider: name,
      healthy,
    }));
  }

  /**
   * Manually set provider health
   */
  setProviderHealth(provider: string, healthy: boolean) {
    this.healthStatus.set(provider, healthy);
  }
}

// Usage Example
async function main() {
  const multiProvider = new MultiProviderNeuroLink([
    {
      name: "openai",
      model: "gpt-4",
      priority: 1,
      costPerToken: 0.03,
    },
    {
      name: "anthropic",
      model: "claude-3-sonnet-20240229",
      priority: 2,
      costPerToken: 0.003,
    },
    {
      name: "google-ai",
      model: "gemini-pro",
      priority: 3,
      costPerToken: 0.00025,
    },
  ]);

  // Generate with automatic fallback
  try {
    const result = await multiProvider.generate(
      "Explain quantum entanglement",
      { timeout: 10000 },
    );

    console.log(
      `\n✅ Response from ${result.provider} (after ${result.attempts} attempts):`,
    );
    console.log(result.content);
  } catch (error: any) {
    console.error("❌ All providers failed:", error.message);
  }

  // Check health status
  console.log("\n📊 Provider Health:");
  const health = multiProvider.getHealthStatus();
  health.forEach((h) => {
    console.log(
      `  ${h.provider}: ${h.healthy ? "✅ Healthy" : "❌ Unhealthy"}`,
    );
  });

  // Stream with fallback
  try {
    const { stream, provider } = await multiProvider.stream(
      "Tell me a short story about AI",
    );

    console.log(`\n📡 Streaming from ${provider}:`);
    for await (const chunk of stream) {
      if (chunk.type === "content-delta") {
        process.stdout.write(chunk.delta);
      }
    }
  } catch (error: any) {
    console.error("\n❌ Streaming failed:", error.message);
  }
}

main();
```

## Explanation

### 1. Provider Priority

Providers are ordered by priority (1 = highest):

```typescript
providers = [
  { name: "openai", priority: 1 }, // Try first
  { name: "anthropic", priority: 2 }, // Fallback
  { name: "google-ai", priority: 3 }, // Last resort
];
```

### 2. Health Monitoring

Track provider health automatically:

- **Healthy**: Available for requests
- **Unhealthy**: Temporarily skipped (auto-recovers after 60s)
- **Failure triggers**: 503, 502, connection errors

### 3. Automatic Failover

On error, automatically try next provider:

```
OpenAI fails → Try Anthropic → Try Google AI → Throw error
```

### 4. Error Classification

Not all errors trigger failover:

- **503, 502**: Provider issue → Mark unhealthy, try next
- **401, 403**: Auth issue → Try next (may have different credentials)
- **400**: Bad request → Don't retry (same error on all providers)

### 5. Timeout Protection

Set timeouts to prevent hanging on slow providers:

```typescript
timeout: 10000; // 10 seconds
```

## Variations

### Cost-Aware Routing

Prefer cheaper providers when quality is similar:

```typescript
async generateCheap(prompt: string) {
  return this.generate(prompt, { preferCheap: true });
}
```

### Region-Aware Routing

Choose provider based on region:

```typescript
type RegionalConfig = ProviderConfig & {
  regions: string[];
};

function getProvidersForRegion(region: string): ProviderConfig[] {
  return providers.filter(
    (p) => p.regions.includes(region) || p.regions.includes("global"),
  );
}
```

### Load Balancing

Distribute load across providers:

```typescript
class LoadBalancedNeuroLink extends MultiProviderNeuroLink {
  private currentIndex = 0;

  async generateBalanced(prompt: string) {
    const providers = this.getHealthyProviders();

    // Round-robin selection
    const provider = providers[this.currentIndex % providers.length];
    this.currentIndex++;

    try {
      return await this.tryProvider(prompt, provider);
    } catch (error) {
      // Fallback to standard failover
      return this.generate(prompt);
    }
  }
}
```

### Model-Specific Fallback

Different models for different tasks:

```typescript
const TASK_PROVIDERS = {
  coding: [
    { name: "openai", model: "gpt-4" },
    { name: "anthropic", model: "claude-3-opus-20240229" },
  ],
  summarization: [
    { name: "anthropic", model: "claude-3-haiku-20240307" },
    { name: "google-ai", model: "gemini-pro" },
  ],
  creative: [
    { name: "openai", model: "gpt-4" },
    { name: "anthropic", model: "claude-3-sonnet-20240229" },
  ],
};

async function generateForTask(task: string, prompt: string) {
  const providers = TASK_PROVIDERS[task as keyof typeof TASK_PROVIDERS];
  const multiProvider = new MultiProviderNeuroLink(
    providers.map((p, i) => ({
      ...p,
      priority: i + 1,
    })),
  );

  return multiProvider.generate(prompt);
}
```

### Health Check Endpoint

Proactive health checking:

```typescript
async function checkAllProviders() {
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const start = Date.now();
      await tryProvider("test", p, 5000);
      return { provider: p.name, latency: Date.now() - start };
    }),
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      console.log(`✅ ${providers[i].name}: ${result.value.latency}ms`);
    } else {
      console.log(`❌ ${providers[i].name}: Failed`);
      markUnhealthy(providers[i].name);
    }
  });
}

// Run health checks every 5 minutes
setInterval(checkAllProviders, 5 * 60 * 1000);
```

## Provider Comparison

| Provider     | Availability | Rate Limits  | Global Regions | Cost |
| ------------ | ------------ | ------------ | -------------- | ---- |
| OpenAI       | 99.9%        | 3500 req/min | Yes            | $$$  |
| Anthropic    | 99.9%        | 1000 req/min | Limited        | $$   |
| Google AI    | 99.5%        | 60 req/min   | Yes            | $    |
| Azure OpenAI | 99.95%       | Custom       | Global         | $$$  |

## Best Practices

1. **Configure at least 2 providers**: Minimum for true failover
2. **Mix provider types**: Different infrastructure = better reliability
3. **Monitor health actively**: Don't wait for failures
4. **Set appropriate timeouts**: Balance speed vs reliability
5. **Log all failovers**: Track patterns for optimization

## See Also

- [Error Recovery Patterns](error-recovery.md)
- [Rate Limit Handling](rate-limit-handling.md)
- [Cost Optimization](cost-optimization.md)
- [Provider Comparison Guide](../reference/provider-comparison.md)
