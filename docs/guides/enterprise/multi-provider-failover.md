---
title: Multi-Provider Failover & High Availability
description: Enterprise-grade high availability with automatic failover across multiple AI providers
keywords: failover, high availability, redundancy, reliability, multi-provider
---

# Multi-Provider Failover Guide

**Build resilient AI applications with automatic provider failover and redundancy**

---

## Overview

Multi-provider failover enables your application to automatically switch between AI providers when one fails, ensuring high availability and reliability. NeuroLink provides built-in failover capabilities with configurable priorities, conditions, and retry strategies.

### Key Benefits

- **🔒 99.9%+ Uptime**: Automatic failover when providers are down
- **⚡ Zero Downtime**: Seamless switching between providers
- **💰 Cost Optimization**: Route to cheaper providers when available
- **🌍 Geographic Redundancy**: Distribute across regions
- **🔄 Smart Retries**: Exponential backoff with configurable limits
- **📊 Failover Metrics**: Track provider reliability

### Use Cases

- **Production Applications**: Ensure critical AI features never go down
- **Cost Optimization**: Use expensive providers only when needed
- **Geographic Distribution**: Serve users from nearest region
- **A/B Testing**: Route traffic between providers for comparison
- **Compliance**: Route EU traffic to GDPR-compliant providers

---

## Quick Start

### Basic Failover Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      priority: 1, // Primary provider
      config: {
        apiKey: process.env.OPENAI_API_KEY,
      },
    },
    {
      name: "anthropic",
      priority: 2, // Fallback 1
      config: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
    },
    {
      name: "google-ai",
      priority: 3, // Fallback 2
      config: {
        apiKey: process.env.GOOGLE_AI_API_KEY,
      },
    },
  ],
});

// Automatically tries OpenAI → Anthropic → Google AI
const result = await ai.generate({
  input: { text: "Hello world!" },
  // No provider specified - uses priority order
});
```

### Test Failover

```typescript
// Simulate OpenAI failure
const result = await ai.generate({
  input: { text: "Test failover" },
});

console.log("Used provider:", result.provider); // Will show fallback provider
console.log("Attempts:", result.metadata.attempts);
console.log("Failed providers:", result.metadata.failedProviders);
```

---

## Failover Strategies

### 1. Priority-Based Failover (Recommended)

Try providers in priority order until one succeeds.

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "openai", priority: 1 }, // Try first
    { name: "anthropic", priority: 2 }, // Try second
    { name: "google-ai", priority: 3 }, // Try third
  ],
  failoverConfig: {
    enabled: true,
    maxAttempts: 3, // Try up to 3 providers
    retryDelay: 1000, // Wait 1s between attempts
    exponentialBackoff: true, // 1s, 2s, 4s delays
  },
});
```

### 2. Condition-Based Routing

Route to specific providers based on request conditions.

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "mistral",
      priority: 1, // (1)!
      condition: (req) => req.userRegion === "EU", // (2)!
      config: { apiKey: process.env.MISTRAL_API_KEY },
    },
    {
      name: "openai",
      priority: 1,
      condition: (req) => req.userRegion !== "EU", // (3)!
      config: { apiKey: process.env.OPENAI_API_KEY },
    },
    {
      name: "google-ai",
      priority: 2, // (4)!
      config: { apiKey: process.env.GOOGLE_AI_API_KEY },
    },
  ],
});

// Usage
const result = await ai.generate({
  input: { text: "Your prompt" },
  metadata: { userRegion: "EU" }, // (5)!
});
```

1. **Same priority**: Both Mistral and OpenAI have priority 1, but conditions determine which one is used.
2. **GDPR compliance**: Route EU users to Mistral AI (European provider) for automatic GDPR compliance.
3. **Regional routing**: Non-EU users go to OpenAI. Multiple providers at same priority with mutually exclusive conditions.
4. **Universal fallback**: Google AI (priority 2) has no condition, so it's used if both priority 1 providers fail.
5. **Pass routing metadata**: Include `userRegion` in metadata so conditions can access it for routing decisions.

### 3. Cost-Based Routing

Try cheaper providers first, fallback to premium providers.

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "google-ai",
      priority: 1, // Free tier first
      model: "gemini-2.0-flash",
      condition: (req) => !req.requiresPremium,
    },
    {
      name: "openai",
      priority: 2, // Paid tier fallback
      model: "gpt-4o-mini",
      condition: (req) => !req.requiresPremium,
    },
    {
      name: "anthropic",
      priority: 3, // Premium for complex tasks
      model: "claude-3-5-sonnet-20241022",
    },
  ],
});

// Cheap query (uses Google AI free tier)
const cheap = await ai.generate({
  input: { text: "Simple customer query" },
  metadata: { requiresPremium: false },
});

// Complex query (uses Anthropic)
const premium = await ai.generate({
  input: { text: "Complex business analysis requiring detailed reasoning..." },
  metadata: { requiresPremium: true },
});
```

### 4. Load-Balanced Failover

Combine load balancing with failover.

```typescript
const ai = new NeuroLink({
  providers: [
    // Load balanced primary tier
    {
      name: "openai-1",
      priority: 1,
      config: { apiKey: process.env.OPENAI_KEY_1 },
    },
    {
      name: "openai-2",
      priority: 1,
      config: { apiKey: process.env.OPENAI_KEY_2 },
    },
    {
      name: "openai-3",
      priority: 1,
      config: { apiKey: process.env.OPENAI_KEY_3 },
    },

    // Fallback tier
    { name: "anthropic", priority: 2 },
    { name: "google-ai", priority: 3 },
  ],
  loadBalancing: "round-robin", // Balance across same-priority providers
  failoverConfig: { enabled: true },
});
```

---

## Retry Configuration

### Exponential Backoff

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "openai", priority: 1 },
    { name: "anthropic", priority: 2 },
  ],
  failoverConfig: {
    enabled: true,
    maxAttempts: 5,
    retryDelay: 1000, // Start with 1s
    exponentialBackoff: true, // 1s, 2s, 4s, 8s, 16s
    maxRetryDelay: 30000, // Cap at 30s
  },
});
```

### Selective Retry

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "openai", priority: 1 },
    { name: "anthropic", priority: 2 },
  ],
  failoverConfig: {
    enabled: true,
    retryOn: [
      // (1)!
      "ECONNREFUSED", // Connection errors
      "ETIMEDOUT", // Timeout
      "429", // Rate limit
      "500", // Server errors
      "502", // Bad gateway
      "503", // Service unavailable
      "504", // Gateway timeout
    ],
    doNotRetryOn: [
      // (2)!
      "400", // Bad request (client error)
      "401", // Invalid API key
      "403", // Forbidden
    ],
  },
});
```

1. **Retryable errors**: Transient failures worth retrying. Network errors (ECONNREFUSED, ETIMEDOUT) and server issues (429, 5xx) often resolve on retry.
2. **Non-retryable errors**: Client-side errors that won't be fixed by retrying. Invalid requests (400), authentication failures (401), and authorization issues (403) require code changes.

### Custom Retry Logic

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "openai", priority: 1 },
    { name: "anthropic", priority: 2 },
  ],
  failoverConfig: {
    enabled: true,
    shouldRetry: (error, attempt, provider) => {
      // Custom retry logic
      if (error.message.includes("rate limit")) {
        console.log(`Rate limited on ${provider}, waiting...`);
        return attempt < 3; // Retry up to 3 times
      }

      if (error.message.includes("timeout")) {
        console.log(`Timeout on ${provider}, trying next...`);
        return false; // Don't retry timeouts, failover immediately
      }

      // Default: retry on network errors
      return error.code?.startsWith("E");
    },
    getRetryDelay: (attempt, error, provider) => {
      // Custom delay calculation
      if (error.message.includes("rate limit")) {
        return 5000; // Wait 5s for rate limits
      }
      return Math.pow(2, attempt) * 1000; // Exponential for others
    },
  },
});
```

---

## Provider Health Checks

### Active Health Monitoring

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "openai", priority: 1 },
    { name: "anthropic", priority: 2 },
    { name: "google-ai", priority: 3 },
  ],
  healthCheck: {
    enabled: true,
    interval: 60000, // Check every 60s
    timeout: 5000, // 5s timeout per check
    unhealthyThreshold: 3, // Mark unhealthy after 3 failures
    healthyThreshold: 2, // Mark healthy after 2 successes
  },
});

// Get provider health status
const health = await ai.getProviderHealth();
console.log(health);
/*
{
  openai: { status: 'healthy', latency: 120, lastCheck: '2025-01-15T10:00:00Z' },
  anthropic: { status: 'unhealthy', latency: null, lastCheck: '2025-01-15T10:00:00Z' },
  'google-ai': { status: 'healthy', latency: 95, lastCheck: '2025-01-15T10:00:00Z' }
}
*/

// Only use healthy providers
const result = await ai.generate({
  input: { text: "Your prompt" },
  useOnlyHealthy: true, // Skip anthropic (unhealthy)
});
```

### Circuit Breaker Pattern

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "openai", priority: 1 },
    { name: "anthropic", priority: 2 },
  ],
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5, // Open circuit after 5 failures
    resetTimeout: 60000, // Try again after 60s
    halfOpenRequests: 3, // Test with 3 requests when half-open
  },
});

// Circuit breaker state machine:
// CLOSED (normal) → 5 failures → OPEN (block requests)
// → wait 60s → HALF_OPEN (test with 3 requests)
// → 3 successes → CLOSED | 1 failure → OPEN

// Get circuit state
const state = await ai.getCircuitState("openai");
console.log(state); // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
```

---

## Production Patterns

### Pattern 1: High Availability Setup

```typescript
// Production-ready HA configuration
const ai = new NeuroLink({
  providers: [
    // Tier 1: Load-balanced primary
    { name: "openai-us-east", priority: 1, region: "us-east-1" },
    { name: "openai-us-west", priority: 1, region: "us-west-2" },

    // Tier 2: Alternative provider
    { name: "anthropic-us", priority: 2 },

    // Tier 3: Emergency fallback
    { name: "google-ai", priority: 3 },
  ],
  loadBalancing: "latency-based", // Route to fastest provider
  failoverConfig: {
    enabled: true,
    maxAttempts: 6, // Try all providers
    retryDelay: 500,
    exponentialBackoff: true,
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // Check every 30s
    timeout: 3000,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 10,
    resetTimeout: 120000, // 2 minutes
  },
});
```

### Pattern 2: Cost-Optimized Failover

```typescript
// Free tier first, paid tier fallback
const ai = new NeuroLink({
  providers: [
    {
      name: "google-ai",
      priority: 1,
      model: "gemini-2.0-flash",
      config: { apiKey: process.env.GOOGLE_AI_KEY },
      costPerToken: 0, // Free tier
    },
    {
      name: "openai",
      priority: 2,
      model: "gpt-4o-mini",
      config: { apiKey: process.env.OPENAI_KEY },
      costPerToken: 0.00015,
    },
    {
      name: "anthropic",
      priority: 3,
      model: "claude-3-5-sonnet-20241022",
      config: { apiKey: process.env.ANTHROPIC_KEY },
      costPerToken: 0.003,
    },
  ],
  failoverConfig: {
    enabled: true,
    // Skip rate-limited free tier immediately
    shouldFailover: (error, provider) => {
      if (provider.costPerToken === 0 && error.message.includes("quota")) {
        console.log("Free tier exhausted, failing over to paid tier");
        return true;
      }
      return error.code?.startsWith("E"); // Network errors
    },
  },
});
```

### Pattern 3: Geographic Routing

```typescript
// Route to nearest region with failover
const ai = new NeuroLink({
  providers: [
    // US East
    {
      name: "openai-us-east",
      priority: 1,
      condition: (req) => req.userRegion === "us-east",
    },

    // US West
    {
      name: "openai-us-west",
      priority: 1,
      condition: (req) => req.userRegion === "us-west",
    },

    // Europe
    {
      name: "mistral-eu",
      priority: 1,
      condition: (req) => req.userRegion === "eu",
    },

    // Asia Pacific
    {
      name: "vertex-asia",
      priority: 1,
      condition: (req) => req.userRegion === "asia",
    },

    // Global fallback
    { name: "openai-global", priority: 2 },
  ],
});

// Usage
const result = await ai.generate({
  input: { text: "Your prompt" },
  metadata: {
    userRegion: getUserRegion(req.ip), // Detect from IP
  },
});
```

### Pattern 4: Model-Specific Failover

```typescript
// Different models with same capability
const ai = new NeuroLink({
  providers: [
    // Primary: GPT-4
    {
      name: "openai",
      priority: 1,
      model: "gpt-4o",
      capability: "complex-reasoning",
    },

    // Fallback 1: Claude 3.5 Sonnet (similar capability)
    {
      name: "anthropic",
      priority: 2,
      model: "claude-3-5-sonnet-20241022",
      capability: "complex-reasoning",
    },

    // Fallback 2: Gemini Pro
    {
      name: "google-ai",
      priority: 3,
      model: "gemini-1.5-pro",
      capability: "complex-reasoning",
    },
  ],
  failoverConfig: {
    enabled: true,
    matchCapability: true, // Only failover to same capability
  },
});
```

---

## Monitoring and Metrics

### Track Failover Events

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "openai", priority: 1 },
    { name: "anthropic", priority: 2 },
  ],
  failoverConfig: {
    enabled: true,
    onFailover: (event) => {
      // Log failover event
      console.log({
        timestamp: new Date().toISOString(),
        from: event.failedProvider,
        to: event.successfulProvider,
        error: event.error.message,
        attempts: event.attempts,
        latency: event.totalLatency,
      });

      // Send to monitoring system
      metrics.increment("ai.failover.count", {
        from: event.failedProvider,
        to: event.successfulProvider,
      });
    },
    onSuccess: (event) => {
      // Log successful request
      metrics.histogram("ai.latency", event.latency, {
        provider: event.provider,
        model: event.model,
      });
    },
  },
});
```

### Failover Metrics Dashboard

```typescript
// Track provider reliability
class FailoverMetrics {
  private stats = new Map();

  recordAttempt(provider: string, success: boolean, latency: number) {
    if (!this.stats.has(provider)) {
      this.stats.set(provider, {
        total: 0,
        successes: 0,
        failures: 0,
        totalLatency: 0,
      });
    }

    const stat = this.stats.get(provider);
    stat.total++;
    stat.totalLatency += latency;

    if (success) {
      stat.successes++;
    } else {
      stat.failures++;
    }
  }

  getProviderStats() {
    const stats = [];

    for (const [provider, stat] of this.stats.entries()) {
      stats.push({
        provider,
        total: stat.total,
        successRate: (stat.successes / stat.total) * 100,
        avgLatency: stat.totalLatency / stat.total,
        failureCount: stat.failures,
      });
    }

    return stats.sort((a, b) => b.successRate - a.successRate);
  }
}

// Usage
const metrics = new FailoverMetrics();

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  failoverConfig: {
    enabled: true,
    onSuccess: (event) => {
      metrics.recordAttempt(event.provider, true, event.latency);
    },
    onFailover: (event) => {
      metrics.recordAttempt(event.failedProvider, false, event.latency);
      metrics.recordAttempt(event.successfulProvider, true, event.latency);
    },
  },
});

// View stats
console.log(metrics.getProviderStats());
/*
[
  { provider: 'openai', total: 1000, successRate: 99.5, avgLatency: 120, failureCount: 5 },
  { provider: 'anthropic', total: 50, successRate: 98.0, avgLatency: 150, failureCount: 1 },
  { provider: 'google-ai', total: 10, successRate: 100, avgLatency: 95, failureCount: 0 }
]
*/
```

---

## Best Practices

### 1. ✅ Always Configure Multiple Providers

```typescript
// ❌ Bad: Single provider (no failover)
const ai = new NeuroLink({
  providers: [{ name: "openai" }],
});

// ✅ Good: Multiple providers with failover
const ai = new NeuroLink({
  providers: [
    { name: "openai", priority: 1 },
    { name: "anthropic", priority: 2 },
    { name: "google-ai", priority: 3 },
  ],
  failoverConfig: { enabled: true },
});
```

### 2. ✅ Use Health Checks in Production

```typescript
// ✅ Good: Active health monitoring
const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  healthCheck: {
    enabled: true,
    interval: 60000, // 1 minute
    timeout: 5000, // 5 seconds
  },
});
```

### 3. ✅ Implement Circuit Breakers

```typescript
// ✅ Good: Prevent cascading failures
const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});
```

### 4. ✅ Monitor Failover Events

```typescript
// ✅ Good: Track failures for debugging
failoverConfig: {
  enabled: true,
  onFailover: (event) => {
    logger.error('Provider failover', {
      from: event.failedProvider,
      to: event.successfulProvider,
      error: event.error
    });

    // Alert if too many failovers
    if (event.attempts > 3) {
      alerting.sendAlert('Multiple provider failures detected');
    }
  }
}
```

### 5. ✅ Test Failover Regularly

```typescript
// ✅ Good: Test failover in CI/CD
describe("Failover", () => {
  it("should failover when primary provider fails", async () => {
    // Mock OpenAI failure
    mockOpenAI.mockRejectedValue(new Error("503 Service Unavailable"));

    const result = await ai.generate({
      input: { text: "test" },
    });

    // Verify failover occurred
    expect(result.provider).toBe("anthropic");
    expect(result.metadata.attempts).toBe(2);
  });
});
```

---

## Troubleshooting

### Issue 1: Failover Not Triggering

**Problem**: Requests fail without trying fallback providers.

**Solution**:

```typescript
// Ensure failover is enabled
failoverConfig: {
  enabled: true,  // Must be true
  maxAttempts: 3  // Must be > 1
}

// Check provider priorities
providers: [
  { name: 'openai', priority: 1 },  // Different priorities
  { name: 'anthropic', priority: 2 }  // Not same priority
]
```

### Issue 2: Too Many Retry Attempts

**Problem**: Requests take too long due to excessive retries.

**Solution**:

```typescript
// Limit retry attempts
failoverConfig: {
  enabled: true,
  maxAttempts: 3,        // Limit attempts
  retryDelay: 1000,      // Reduce delay
  maxRetryDelay: 5000    // Cap max delay
}
```

### Issue 3: Circuit Breaker Stuck Open

**Problem**: Provider marked as failed even when healthy.

**Solution**:

```typescript
// Adjust circuit breaker settings
circuitBreaker: {
  enabled: true,
  failureThreshold: 10,    // Increase threshold
  resetTimeout: 30000,     // Reduce timeout
  halfOpenRequests: 5      // More test requests
}

// Manually reset circuit
await ai.resetCircuit('openai');
```

---

## Related Documentation

**Feature Guides:**

- **[Provider Orchestration](../../features/provider-orchestration.md)** - Intelligent provider selection and routing
- **[Regional Streaming](../../features/regional-streaming.md)** - Region-specific failover strategies
- **[Auto Evaluation](../../features/auto-evaluation.md)** - Validate failover quality

**Enterprise Guides:**

- **[Load Balancing Guide](./load-balancing.md)** - Distribution strategies
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
