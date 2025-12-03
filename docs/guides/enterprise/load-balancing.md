---
title: Load Balancing Strategies
description: Six intelligent load balancing strategies for distributing AI requests across providers
keywords: load balancing, distribution, round-robin, weighted, latency-based, cost-based
---

# Load Balancing Guide

**Distribute AI requests across multiple providers, API keys, and regions for optimal performance**

---

## Overview

Load balancing distributes incoming AI requests across multiple providers, API keys, or model instances to optimize throughput, reduce latency, and prevent rate limiting. NeuroLink supports multiple load balancing strategies out of the box.

### Key Benefits

- **⚡ Higher Throughput**: Parallel requests across multiple keys/providers
- **🔒 Avoid Rate Limits**: Distribute load to stay within quotas
- **🌍 Lower Latency**: Route to fastest/nearest provider
- **💰 Cost Optimization**: Balance between free and paid tiers
- **📊 Fair Distribution**: Ensure even usage across resources
- **🔄 Dynamic Scaling**: Add/remove providers on the fly

### Use Cases

- **High-Volume Applications**: Handle 1000s of requests/second
- **Rate Limit Management**: Stay within provider quotas
- **Multi-Region Deployment**: Serve global users efficiently
- **Cost Management**: Maximize free tier usage before paid
- **A/B Testing**: Compare provider performance
- **Gradual Rollouts**: Slowly migrate between providers

---

## Quick Start

### Basic Round-Robin Load Balancing

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    {
      name: "openai-key-1",
      config: { apiKey: process.env.OPENAI_KEY_1 },
    },
    {
      name: "openai-key-2",
      config: { apiKey: process.env.OPENAI_KEY_2 },
    },
    {
      name: "openai-key-3",
      config: { apiKey: process.env.OPENAI_KEY_3 },
    },
  ],
  loadBalancing: "round-robin",
});

// Requests distributed evenly:
// Request 1 → openai-key-1
// Request 2 → openai-key-2
// Request 3 → openai-key-3
// Request 4 → openai-key-1 (cycles back)

for (let i = 0; i < 10; i++) {
  const result = await ai.generate({
    input: { text: `Request ${i}` },
  });
  console.log(`Used: ${result.provider}`);
}
```

---

## Load Balancing Strategies

### 1. Round-Robin (Default)

Distribute requests evenly in circular order.

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "provider-1" },
    { name: "provider-2" },
    { name: "provider-3" },
  ],
  loadBalancing: "round-robin",
});

// Distribution: P1 → P2 → P3 → P1 → P2 → P3 ...
```

**Best for:**

- Providers with equal capacity
- Even distribution needed
- Simple setup

### 2. Weighted Round-Robin

Distribute based on provider weights.

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "provider-1", weight: 3 }, // 60% of traffic
    { name: "provider-2", weight: 2 }, // 40% of traffic
  ],
  loadBalancing: "weighted-round-robin",
});

// Out of 5 requests:
// 3 → provider-1 (60%)
// 2 → provider-2 (40%)
```

**Best for:**

- Different provider capacities
- Gradual migrations
- Free tier optimization

**Example: Free Tier Prioritization**

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "google-ai",
      weight: 5, // 71% (free tier)
      config: { apiKey: process.env.GOOGLE_AI_KEY },
    },
    {
      name: "openai",
      weight: 2, // 29% (paid tier, lower priority)
      config: { apiKey: process.env.OPENAI_KEY },
    },
  ],
  loadBalancing: "weighted-round-robin",
});
```

### 3. Least-Busy

Route to provider with fewest active requests.

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "provider-1" },
    { name: "provider-2" },
    { name: "provider-3" },
  ],
  loadBalancing: "least-busy",
});

// Automatically routes to least loaded provider
// Active requests: P1=5, P2=2, P3=8 → Routes to P2
```

**Best for:**

- Varying request durations
- High concurrency
- Real-time load adaptation

### 4. Latency-Based Routing

Route to fastest provider.

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "provider-1" },
    { name: "provider-2" },
    { name: "provider-3" },
  ],
  loadBalancing: "latency-based",
  healthCheck: {
    enabled: true,
    interval: 30000, // Update latency every 30s
  },
});

// Routes to provider with lowest average latency
// Latencies: P1=120ms, P2=95ms, P3=200ms → Routes to P2
```

**Best for:**

- Geographic distribution
- Performance-critical apps
- Multi-region deployments

### 5. Hash-Based (Consistent Hashing)

Route same user/request to same provider.

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "provider-1" },
    { name: "provider-2" },
    { name: "provider-3" },
  ],
  loadBalancing: "hash",
  hashKey: (req) => req.userId, // Hash on user ID
});

// Same user always routed to same provider
// user123 → always provider-2
// user456 → always provider-1
```

**Best for:**

- Session affinity
- Conversation continuity
- Caching optimization

**Example: User-Based Routing**

```typescript
const result = await ai.generate({
  input: { text: "Your prompt" },
  metadata: { userId: "user-123" }, // Always routes to same provider
});
```

### 6. Random

Randomly select provider.

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "provider-1" },
    { name: "provider-2" },
    { name: "provider-3" },
  ],
  loadBalancing: "random",
});

// Randomly selects any provider
// Good for simple load distribution
```

**Best for:**

- Testing/development
- Stateless requests
- Equal provider capacity

---

## Multi-Key Load Balancing

### Managing Rate Limits

Distribute across multiple API keys to increase throughput.

```typescript
// OpenAI: 500 RPM per key → 2500 RPM total with 5 keys
const ai = new NeuroLink({
  providers: [
    { name: "openai-1", config: { apiKey: process.env.OPENAI_KEY_1 } },
    { name: "openai-2", config: { apiKey: process.env.OPENAI_KEY_2 } },
    { name: "openai-3", config: { apiKey: process.env.OPENAI_KEY_3 } },
    { name: "openai-4", config: { apiKey: process.env.OPENAI_KEY_4 } },
    { name: "openai-5", config: { apiKey: process.env.OPENAI_KEY_5 } },
  ],
  loadBalancing: "round-robin",
  rateLimit: {
    requestsPerMinute: 500, // Per key limit
    strategy: "distributed", // Enforce across all keys
  },
});

// Total capacity: 2,500 RPM (5 keys × 500 RPM)
```

### Quota Management

Track usage across multiple keys.

```typescript
class QuotaManager {
  private usage = new Map<
    string,
    {
      requestsThisMinute: number;
      tokensThisMinute: number;
      minuteStart: number;
    }
  >();

  canUseProvider(providerName: string): boolean {
    const quota = this.usage.get(providerName);
    if (!quota) return true;

    const now = Date.now();

    // Reset if new minute
    if (now - quota.minuteStart > 60000) {
      quota.requestsThisMinute = 0;
      quota.tokensThisMinute = 0;
      quota.minuteStart = now;
      return true;
    }

    // Check limits (OpenAI Tier 1: 500 RPM, 30K TPM)
    return quota.requestsThisMinute < 500 && quota.tokensThisMinute < 30000;
  }

  recordUsage(providerName: string, tokens: number) {
    if (!this.usage.has(providerName)) {
      this.usage.set(providerName, {
        requestsThisMinute: 0,
        tokensThisMinute: 0,
        minuteStart: Date.now(),
      });
    }

    const quota = this.usage.get(providerName)!;
    quota.requestsThisMinute++;
    quota.tokensThisMinute += tokens;
  }
}

// Usage
const quotaManager = new QuotaManager();

const ai = new NeuroLink({
  providers: [
    { name: "openai-1", config: { apiKey: process.env.OPENAI_KEY_1 } },
    { name: "openai-2", config: { apiKey: process.env.OPENAI_KEY_2 } },
    { name: "openai-3", config: { apiKey: process.env.OPENAI_KEY_3 } },
  ],
  loadBalancing: {
    strategy: "custom",
    selector: (providers, req) => {
      // Select first provider below quota
      return (
        providers.find((p) => quotaManager.canUseProvider(p.name)) ||
        providers[0]
      );
    },
  },
  onSuccess: (result) => {
    quotaManager.recordUsage(result.provider, result.usage.totalTokens);
  },
});
```

---

## Multi-Provider Load Balancing

### Cross-Provider Distribution

Balance across different AI providers.

```typescript
const ai = new NeuroLink({
  providers: [
    // 50% OpenAI
    { name: "openai", weight: 5, config: { apiKey: process.env.OPENAI_KEY } },

    // 30% Anthropic
    {
      name: "anthropic",
      weight: 3,
      config: { apiKey: process.env.ANTHROPIC_KEY },
    },

    // 20% Google AI
    {
      name: "google-ai",
      weight: 2,
      config: { apiKey: process.env.GOOGLE_AI_KEY },
    },
  ],
  loadBalancing: "weighted-round-robin",
});

// Distribution: 50% OpenAI, 30% Anthropic, 20% Google AI
```

### A/B Testing

Compare provider performance.

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      weight: 1,
      config: { apiKey: process.env.OPENAI_KEY },
      tags: ["experiment-a"],
    },
    {
      name: "anthropic",
      weight: 1,
      config: { apiKey: process.env.ANTHROPIC_KEY },
      tags: ["experiment-b"],
    },
  ],
  loadBalancing: "weighted-round-robin",
  onSuccess: (result) => {
    // Track metrics for each variant
    analytics.track("ai_request", {
      provider: result.provider,
      experiment: result.tags[0],
      latency: result.latency,
      tokens: result.usage.totalTokens,
      cost: result.cost,
    });
  },
});

// After collecting data, analyze which performs better
```

---

## Geographic Load Balancing

### Multi-Region Setup

Route users to nearest provider.

```typescript
const ai = new NeuroLink({
  providers: [
    // US East
    {
      name: "openai-us-east",
      region: "us-east-1",
      priority: 1,
      condition: (req) => req.userRegion === "us-east",
    },

    // US West
    {
      name: "openai-us-west",
      region: "us-west-2",
      priority: 1,
      condition: (req) => req.userRegion === "us-west",
    },

    // Europe
    {
      name: "mistral-eu",
      region: "eu-west-1",
      priority: 1,
      condition: (req) => req.userRegion === "eu",
    },

    // Asia Pacific
    {
      name: "vertex-asia",
      region: "asia-southeast1",
      priority: 1,
      condition: (req) => req.userRegion === "asia",
    },
  ],
  loadBalancing: "latency-based",
});

// Usage
const result = await ai.generate({
  input: { text: "Your prompt" },
  metadata: {
    userRegion: detectRegion(req.ip), // us-east, us-west, eu, asia
  },
});
```

### Latency-Optimized Routing

```typescript
// Track provider latencies
class LatencyTracker {
  private latencies = new Map<string, number[]>();

  recordLatency(provider: string, latency: number) {
    if (!this.latencies.has(provider)) {
      this.latencies.set(provider, []);
    }

    const arr = this.latencies.get(provider)!;
    arr.push(latency);

    // Keep last 100 measurements
    if (arr.length > 100) {
      arr.shift();
    }
  }

  getAverageLatency(provider: string): number {
    const arr = this.latencies.get(provider) || [];
    if (arr.length === 0) return Infinity;

    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  getFastestProvider(providers: string[]): string {
    let fastest = providers[0];
    let lowestLatency = this.getAverageLatency(fastest);

    for (const provider of providers) {
      const latency = this.getAverageLatency(provider);
      if (latency < lowestLatency) {
        lowestLatency = latency;
        fastest = provider;
      }
    }

    return fastest;
  }
}

// Usage
const tracker = new LatencyTracker();

const ai = new NeuroLink({
  providers: [
    { name: "provider-1" },
    { name: "provider-2" },
    { name: "provider-3" },
  ],
  loadBalancing: {
    strategy: "custom",
    selector: (providers) => {
      const fastest = tracker.getFastestProvider(providers.map((p) => p.name));
      return providers.find((p) => p.name === fastest)!;
    },
  },
  onSuccess: (result) => {
    tracker.recordLatency(result.provider, result.latency);
  },
});
```

---

## Advanced Patterns

### Pattern 1: Tiered Load Balancing

Combine multiple strategies across tiers.

```typescript
const ai = new NeuroLink({
  providers: [
    // Tier 1: Free tier (round-robin within tier)
    { name: "google-ai-1", tier: 1, cost: 0 },
    { name: "google-ai-2", tier: 1, cost: 0 },
    { name: "google-ai-3", tier: 1, cost: 0 },

    // Tier 2: Cheap paid (round-robin within tier)
    { name: "openai-mini-1", tier: 2, cost: 0.15 },
    { name: "openai-mini-2", tier: 2, cost: 0.15 },

    // Tier 3: Premium (only when needed)
    { name: "anthropic-claude", tier: 3, cost: 3.0 },
  ],
  loadBalancing: {
    strategy: "tiered",
    tierStrategy: "round-robin", // Within each tier
    tierFallback: true, // Fall through tiers on failure
  },
});
```

### Pattern 2: Cost-Optimized Balancing

Balance based on cost and quota.

```typescript
async function costOptimizedSelect(
  providers: Provider[],
  req: Request,
): Promise<Provider> {
  // Sort by cost (cheapest first)
  const sorted = providers.sort((a, b) => a.cost - b.cost);

  // Try each provider in cost order
  for (const provider of sorted) {
    // Check if provider has quota available
    if (await hasQuotaAvailable(provider)) {
      return provider;
    }
  }

  // All cheap providers exhausted, use expensive fallback
  return sorted[sorted.length - 1];
}

const ai = new NeuroLink({
  providers: [
    { name: "google-ai", cost: 0 }, // Free tier
    { name: "openai-mini", cost: 0.15 }, // Cheap paid
    { name: "gpt-4", cost: 3.0 }, // Premium
  ],
  loadBalancing: {
    strategy: "custom",
    selector: costOptimizedSelect,
  },
});
```

### Pattern 3: Request-Type Based Routing

Route based on request characteristics.

```typescript
const ai = new NeuroLink({
  providers: [
    // Fast, cheap model for simple queries
    {
      name: "gemini-flash",
      condition: (req) => req.complexity === "low",
      model: "gemini-2.0-flash",
    },

    // Balanced for medium complexity
    {
      name: "gpt-4o-mini",
      condition: (req) => req.complexity === "medium",
      model: "gpt-4o-mini",
    },

    // Premium for complex queries
    {
      name: "claude-sonnet",
      condition: (req) => req.complexity === "high",
      model: "claude-3-5-sonnet-20241022",
    },
  ],
});

// Usage
const simpleResult = await ai.generate({
  input: { text: "What is 2+2?" },
  metadata: { complexity: "low" }, // Routes to gemini-flash
});

const complexResult = await ai.generate({
  input: { text: "Analyze this complex business scenario..." },
  metadata: { complexity: "high" }, // Routes to claude-sonnet
});
```

---

## Monitoring and Metrics

### Load Distribution Dashboard

```typescript
class LoadBalancerMetrics {
  private stats = new Map<
    string,
    {
      requests: number;
      errors: number;
      totalLatency: number;
      lastUsed: number;
    }
  >();

  recordRequest(provider: string, latency: number, error: boolean) {
    if (!this.stats.has(provider)) {
      this.stats.set(provider, {
        requests: 0,
        errors: 0,
        totalLatency: 0,
        lastUsed: Date.now(),
      });
    }

    const stat = this.stats.get(provider)!;
    stat.requests++;
    stat.totalLatency += latency;
    stat.lastUsed = Date.now();

    if (error) {
      stat.errors++;
    }
  }

  getStats() {
    const total = Array.from(this.stats.values()).reduce(
      (sum, stat) => sum + stat.requests,
      0,
    );

    return Array.from(this.stats.entries()).map(([provider, stat]) => ({
      provider,
      requests: stat.requests,
      percentage: (stat.requests / total) * 100,
      errorRate: (stat.errors / stat.requests) * 100,
      avgLatency: stat.totalLatency / stat.requests,
      lastUsed: new Date(stat.lastUsed).toISOString(),
    }));
  }
}

// Usage
const metrics = new LoadBalancerMetrics();

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  onSuccess: (result) => {
    metrics.recordRequest(result.provider, result.latency, false);
  },
  onError: (error, provider) => {
    metrics.recordRequest(provider, 0, true);
  },
});

// View dashboard
console.table(metrics.getStats());
/*
┌─────────┬──────────────┬──────────┬────────────┬───────────┬─────────┬──────────────────────────┐
│ (index) │   provider   │ requests │ percentage │ errorRate │ avgLat  │        lastUsed          │
├─────────┼──────────────┼──────────┼────────────┼───────────┼─────────┼──────────────────────────┤
│    0    │  'openai-1'  │   342    │   34.2     │    0.29   │  125ms  │ 2025-01-15T10:30:45.123Z │
│    1    │  'openai-2'  │   338    │   33.8     │    0.00   │  118ms  │ 2025-01-15T10:30:46.456Z │
│    2    │  'openai-3'  │   320    │   32.0     │    0.31   │  132ms  │ 2025-01-15T10:30:44.789Z │
└─────────┴──────────────┴──────────┴────────────┴───────────┴─────────┴──────────────────────────┘
*/
```

---

## Best Practices

### 1. ✅ Use Weighted Balancing for Migrations

```typescript
// ✅ Good: Gradual migration from OpenAI to Anthropic
const ai = new NeuroLink({
  providers: [
    { name: "openai", weight: 7 }, // 70% (gradually decrease)
    { name: "anthropic", weight: 3 }, // 30% (gradually increase)
  ],
  loadBalancing: "weighted-round-robin",
});

// Week 1: 70/30 split
// Week 2: 50/50 split
// Week 3: 30/70 split
// Week 4: 0/100 split (fully migrated)
```

### 2. ✅ Monitor Distribution Fairness

```typescript
// ✅ Good: Alert if distribution becomes uneven
const expectedDistribution = {
  "provider-1": 33.3,
  "provider-2": 33.3,
  "provider-3": 33.3,
};

setInterval(() => {
  const stats = metrics.getStats();

  for (const stat of stats) {
    const expected = expectedDistribution[stat.provider];
    const deviation = Math.abs(stat.percentage - expected);

    if (deviation > 10) {
      // >10% deviation
      alerting.sendAlert(
        `Uneven distribution: ${stat.provider} at ${stat.percentage}% (expected ${expected}%)`,
      );
    }
  }
}, 60000); // Check every minute
```

### 3. ✅ Use Health Checks with Load Balancing

```typescript
// ✅ Good: Don't route to unhealthy providers
const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  loadBalancing: "round-robin",
  healthCheck: {
    enabled: true,
    interval: 30000,
    excludeUnhealthy: true, // Skip unhealthy providers
  },
});
```

### 4. ✅ Implement Circuit Breakers

```typescript
// ✅ Good: Prevent cascading failures
const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  loadBalancing: "round-robin",
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});
```

### 5. ✅ Test Load Distribution

```typescript
// ✅ Good: Verify even distribution in tests
describe("Load Balancing", () => {
  it("should distribute requests evenly", async () => {
    const usage = new Map<string, number>();

    for (let i = 0; i < 300; i++) {
      const result = await ai.generate({
        input: { text: `Request ${i}` },
      });

      usage.set(result.provider, (usage.get(result.provider) || 0) + 1);
    }

    // Each provider should get ~100 requests (±10%)
    for (const [provider, count] of usage.entries()) {
      expect(count).toBeGreaterThan(90);
      expect(count).toBeLessThan(110);
    }
  });
});
```

---

## Related Documentation

- **[Multi-Provider Failover](./multi-provider-failover.md)** - Automatic failover
- **[Cost Optimization](./cost-optimization.md)** - Reduce AI costs
- **[Provider Setup](../../getting-started/provider-setup.md)** - Provider configuration
- **[Monitoring Guide](./monitoring.md)** - Observability and metrics

---

## Additional Resources

- **[NeuroLink GitHub](https://github.com/juspay/neurolink)** - Source code
- **[GitHub Discussions](https://github.com/juspay/neurolink/discussions)** - Community support
- **[Issues](https://github.com/juspay/neurolink/issues)** - Report bugs

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
