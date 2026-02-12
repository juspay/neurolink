---
title: Analytics Reference
description: Comprehensive guide to NeuroLink analytics, metrics, and usage tracking
---

# Analytics Reference

NeuroLink provides comprehensive analytics capabilities for tracking token usage, costs, performance metrics, and quality evaluation across all AI provider interactions.

## Overview

The analytics system in NeuroLink consists of several interconnected components:

| Component                  | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| **Token Usage Tracking**   | Monitor input/output tokens, cache tokens, and reasoning tokens |
| **Cost Analytics**         | Estimate and track costs across providers and models            |
| **Performance Metrics**    | Measure response times, throughput, and memory usage            |
| **Quality Evaluation**     | Assess response relevance, accuracy, and completeness           |
| **Middleware Integration** | Automatic analytics collection via middleware                   |

## Token Usage Tracking

### Basic Token Usage

NeuroLink automatically tracks token usage for every generation:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain quantum computing in simple terms" },
  provider: "openai",
  enableAnalytics: true,
});

// Access token usage
console.log("Token Usage:", {
  input: result.usage?.input,
  output: result.usage?.output,
  total: result.usage?.total,
});

// Full analytics data
console.log("Analytics:", result.analytics);
```

### TokenUsage Type

The `TokenUsage` type provides detailed token information:

```typescript
type TokenUsage = {
  /** Number of input/prompt tokens */
  input: number;
  /** Number of output/completion tokens */
  output: number;
  /** Total tokens (input + output) */
  total: number;
  /** Tokens used to create cache entries (Anthropic, Google) */
  cacheCreationTokens?: number;
  /** Tokens read from cache (cost savings) */
  cacheReadTokens?: number;
  /** Tokens used for reasoning/thinking (o1, Claude thinking) */
  reasoning?: number;
  /** Percentage of cost saved through caching */
  cacheSavingsPercent?: number;
};
```

### Cache Token Tracking

For providers that support prompt caching (Anthropic, Google), NeuroLink tracks cache metrics:

```typescript
const result = await neurolink.generate({
  input: { text: "Analyze this document..." },
  provider: "anthropic",
  enableAnalytics: true,
});

if (result.analytics?.tokenUsage) {
  const { cacheCreationTokens, cacheReadTokens, cacheSavingsPercent } =
    result.analytics.tokenUsage;

  if (cacheCreationTokens) {
    console.log(`Cache created: ${cacheCreationTokens} tokens`);
  }
  if (cacheReadTokens) {
    console.log(`Cache hit: ${cacheReadTokens} tokens`);
    console.log(`Cost savings: ${cacheSavingsPercent}%`);
  }
}
```

### Reasoning Token Tracking

For models with extended thinking capabilities (OpenAI o1, Anthropic Claude with thinking, Gemini 3):

```typescript
const result = await neurolink.generate({
  input: { text: "Solve this complex mathematical proof..." },
  provider: "openai",
  model: "o1-mini",
  enableAnalytics: true,
});

if (result.analytics?.tokenUsage.reasoning) {
  console.log(
    `Reasoning tokens used: ${result.analytics.tokenUsage.reasoning}`,
  );
}
```

## Cost Analytics

### Automatic Cost Estimation

NeuroLink automatically estimates costs based on provider pricing:

```typescript
const result = await neurolink.generate({
  input: { text: "Write a detailed business plan" },
  provider: "openai",
  model: "gpt-4o",
  enableAnalytics: true,
});

if (result.analytics?.cost !== undefined) {
  console.log(`Estimated cost: $${result.analytics.cost.toFixed(5)}`);
}
```

### Cost Calculation Formula

Costs are calculated using per-token pricing:

```typescript
// Internal cost calculation
const inputCost = (tokens.input / 1000) * costInfo.input;
const outputCost = (tokens.output / 1000) * costInfo.output;
const totalCost = inputCost + outputCost;
```

### Provider Pricing Configuration

NeuroLink uses configurable pricing for each provider:

| Provider      | Default Input Cost (per 1K) | Default Output Cost (per 1K) |
| ------------- | --------------------------- | ---------------------------- |
| OpenAI        | $0.00015                    | $0.0006                      |
| Anthropic     | $0.0015                     | $0.0075                      |
| Google AI     | $0.000075                   | $0.0003                      |
| Google Vertex | $0.000075                   | $0.0003                      |
| Bedrock       | $0.0015                     | $0.0075                      |
| Azure         | $0.00015                    | $0.0006                      |
| Mistral       | $0.0001                     | $0.0003                      |
| HuggingFace   | $0.0002                     | $0.0008                      |
| Ollama        | $0                          | $0                           |

### Custom Cost Configuration

Override default pricing via environment variables:

```bash
# Custom pricing for Google AI
GOOGLE_AI_DEFAULT_INPUT_COST=0.0001
GOOGLE_AI_DEFAULT_OUTPUT_COST=0.0004

# Custom pricing for OpenAI
OPENAI_DEFAULT_INPUT_COST=0.0002
OPENAI_DEFAULT_OUTPUT_COST=0.0008
```

### Aggregating Costs

Track cumulative costs across multiple requests:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const usages = [];

// Collect usage from multiple requests
for (const prompt of prompts) {
  const result = await neurolink.generate({
    input: { text: prompt },
    enableAnalytics: true,
  });
  if (result.usage) {
    usages.push(result.usage);
  }
}

// Calculate total usage manually
const totalUsage = usages.reduce(
  (total, current) => ({
    input: total.input + current.input,
    output: total.output + current.output,
    total: total.total + current.total,
  }),
  { input: 0, output: 0, total: 0 },
);

console.log(`Total tokens used: ${totalUsage.total}`);
```

## Performance Metrics

### Response Time Tracking

Every request automatically tracks response time:

```typescript
const result = await neurolink.generate({
  input: { text: "Quick response test" },
  enableAnalytics: true,
});

console.log(`Response time: ${result.responseTime}ms`);
console.log(`Analytics duration: ${result.analytics?.requestDuration}ms`);
```

### AnalyticsData Structure

The complete analytics data structure:

```typescript
type AnalyticsData = {
  /** Provider used for the request */
  provider: string;
  /** Model used for the request */
  model?: string;
  /** Token usage breakdown */
  tokenUsage: TokenUsage;
  /** Request duration in milliseconds */
  requestDuration: number;
  /** ISO timestamp of the request */
  timestamp: string;
  /** Estimated cost in USD */
  cost?: number;
  /** Custom context data */
  context?: Record<string, unknown>;
};
```

### Performance Metrics Type

For advanced performance tracking:

```typescript
type PerformanceMetrics = {
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime?: number;
  /** Total duration in ms */
  duration?: number;
  /** Memory usage at start */
  memoryStart: NodeJS.MemoryUsage;
  /** Memory usage at end */
  memoryEnd?: NodeJS.MemoryUsage;
  /** Memory delta */
  memoryDelta?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
};
```

### Stream Performance Metrics

For streaming requests, additional metrics are available:

```typescript
type StreamAnalyticsData = {
  /** Tool execution results with timing */
  toolResults?: Promise<Array<unknown>>;
  /** Tool calls made during stream */
  toolCalls?: Promise<Array<unknown>>;
  /** Stream performance metrics */
  performance?: {
    startTime: number;
    endTime?: number;
    chunkCount: number;
    avgChunkSize: number;
    totalBytes: number;
  };
  /** Provider analytics */
  providerAnalytics?: AnalyticsData;
};
```

### Streaming Example

```typescript
const stream = await neurolink.stream({
  input: { text: "Write a long story" },
  enableAnalytics: true,
});

let chunkCount = 0;
for await (const chunk of stream.textStream) {
  chunkCount++;
  process.stdout.write(chunk);
}

// Access stream analytics after completion
const analytics = await stream.analytics;
console.log(`\nChunks received: ${chunkCount}`);
console.log(`Total tokens: ${analytics?.tokenUsage?.total}`);
```

## Quality Evaluation

### Enabling Evaluation

NeuroLink can automatically evaluate response quality:

```typescript
const result = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "openai",
  enableAnalytics: true,
  enableEvaluation: true,
});

if (result.evaluation) {
  console.log("Evaluation Results:", {
    relevance: result.evaluation.relevance,
    accuracy: result.evaluation.accuracy,
    completeness: result.evaluation.completeness,
    overall: result.evaluation.overall,
    reasoning: result.evaluation.reasoning,
  });
}
```

### EvaluationData Structure

```typescript
type EvaluationData = {
  // Core scores (1-10 scale)
  /** How well response addresses query intent */
  relevance: number;
  /** Factual correctness and accuracy */
  accuracy: number;
  /** How completely the response addresses the query */
  completeness: number;
  /** Overall quality score */
  overall: number;

  // Domain-specific scores
  /** Domain alignment score */
  domainAlignment?: number;
  /** Terminology accuracy */
  terminologyAccuracy?: number;
  /** Tool effectiveness score */
  toolEffectiveness?: number;

  // Quality indicators
  /** True if response deviates from query/domain */
  isOffTopic: boolean;
  /** Quality alert level: low, medium, high, none */
  alertSeverity: "low" | "medium" | "high" | "none";
  /** Brief justification for scores */
  reasoning: string;
  /** Suggestions for improvement */
  suggestedImprovements?: string;

  // Metadata
  /** Model used for evaluation */
  evaluationModel: string;
  /** Time taken for evaluation (ms) */
  evaluationTime: number;
  /** Domain for evaluation */
  evaluationDomain?: string;
};
```

### Domain-Aware Evaluation

Configure evaluation for specific domains:

```typescript
const result = await neurolink.generate({
  input: { text: "What are the side effects of aspirin?" },
  provider: "openai",
  enableEvaluation: true,
  evaluationDomain: "healthcare",
});

if (result.evaluation?.domainEvaluation) {
  console.log("Domain Evaluation:", {
    domainRelevance: result.evaluation.domainEvaluation.domainRelevance,
    terminologyAccuracy: result.evaluation.domainEvaluation.terminologyAccuracy,
    domainExpertise: result.evaluation.domainEvaluation.domainExpertise,
  });
}
```

### Evaluation Providers

Evaluation can use different providers:

```typescript
type EvaluationProvider =
  | "openai"
  | "anthropic"
  | "vertex"
  | "google-ai"
  | "local";
```

## Analytics Middleware

### Using Analytics Middleware

NeuroLink provides built-in analytics middleware:

```typescript
import { createAnalyticsMiddleware } from "@juspay/neurolink/middleware";

const analyticsMiddleware = createAnalyticsMiddleware();

const neurolink = new NeuroLink({
  middleware: [analyticsMiddleware],
});
```

### Middleware Metadata

The analytics middleware provides:

```typescript
const metadata = {
  id: "analytics",
  name: "Analytics Tracking",
  description:
    "Tracks token usage, response times, and model performance metrics",
  priority: 100, // High priority to ensure capture
  defaultEnabled: true,
};
```

### Custom Analytics Collection

Implement custom analytics collection:

```typescript
import type { NeuroLinkMiddleware } from "@juspay/neurolink";

function createCustomAnalyticsMiddleware(): NeuroLinkMiddleware {
  const metrics: Map<string, Record<string, unknown>> = new Map();

  return {
    metadata: {
      id: "custom-analytics",
      name: "Custom Analytics",
      description: "Custom analytics tracking",
      priority: 90,
      defaultEnabled: true,
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      const requestId = `req-${Date.now()}`;
      const startTime = Date.now();

      try {
        const result = await doGenerate();
        const duration = Date.now() - startTime;

        metrics.set(requestId, {
          duration,
          tokens: result.usage,
          timestamp: new Date().toISOString(),
        });

        return result;
      } catch (error) {
        metrics.set(requestId, {
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });
        throw error;
      }
    },
  };
}
```

## Analytics Utilities

### Formatting Utilities

```typescript
import {
  formatTokenUsage,
  formatAnalyticsForDisplay,
  getAnalyticsSummary,
} from "@juspay/neurolink/utils/analyticsUtils";

// Format token usage as string
const usageString = formatTokenUsage(result.usage);
// Output: "100 input / 50 output / 20 cache-read"

// Format full analytics for display
const display = formatAnalyticsForDisplay(result.analytics);
// Output: "Provider: openai | Model: gpt-4o | Tokens: 100 input / 50 output | Cost: $0.00015 | Time: 1.2s"

// Get analytics summary
const summary = getAnalyticsSummary(result.analytics);
console.log({
  totalTokens: summary.totalTokens,
  costPerToken: summary.costPerToken,
  requestsPerSecond: summary.requestsPerSecond,
});
```

### Validation Utilities

```typescript
import {
  hasValidTokenUsage,
  isTokenUsage,
} from "@juspay/neurolink/utils/analyticsUtils";

// Check if analytics has valid token usage
if (hasValidTokenUsage(result.analytics)) {
  // Safe to access token fields
}

// Type guard for token usage
if (isTokenUsage(data)) {
  console.log(data.total);
}
```

## Integration with Observability Tools

### OpenTelemetry Integration

Export analytics to OpenTelemetry:

```typescript
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("neurolink");

async function trackedGenerate(options: GenerateOptions) {
  return tracer.startActiveSpan("neurolink.generate", async (span) => {
    try {
      const result = await neurolink.generate({
        ...options,
        enableAnalytics: true,
      });

      // Add analytics as span attributes
      if (result.analytics) {
        span.setAttributes({
          "ai.provider": result.analytics.provider,
          "ai.model": result.analytics.model || "unknown",
          "ai.tokens.input": result.analytics.tokenUsage.input,
          "ai.tokens.output": result.analytics.tokenUsage.output,
          "ai.tokens.total": result.analytics.tokenUsage.total,
          "ai.cost": result.analytics.cost || 0,
          "ai.duration_ms": result.analytics.requestDuration,
        });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Prometheus Metrics

Export metrics to Prometheus:

```typescript
import { Counter, Histogram, Gauge } from "prom-client";

// Define metrics
const tokenCounter = new Counter({
  name: "neurolink_tokens_total",
  help: "Total tokens used",
  labelNames: ["provider", "model", "type"],
});

const costGauge = new Gauge({
  name: "neurolink_cost_dollars",
  help: "Estimated cost in dollars",
  labelNames: ["provider", "model"],
});

const latencyHistogram = new Histogram({
  name: "neurolink_request_duration_ms",
  help: "Request duration in milliseconds",
  labelNames: ["provider", "model"],
  buckets: [100, 250, 500, 1000, 2500, 5000, 10000],
});

// Record metrics after each request
function recordMetrics(analytics: AnalyticsData) {
  const labels = {
    provider: analytics.provider,
    model: analytics.model || "unknown",
  };

  tokenCounter.inc({ ...labels, type: "input" }, analytics.tokenUsage.input);
  tokenCounter.inc({ ...labels, type: "output" }, analytics.tokenUsage.output);

  if (analytics.cost !== undefined) {
    costGauge.set(labels, analytics.cost);
  }

  latencyHistogram.observe(labels, analytics.requestDuration);
}
```

### DataDog Integration

Send analytics to DataDog:

```typescript
import { DogStatsDClient } from "hot-shots";

const dogstatsd = new DogStatsDClient();

function sendToDataDog(analytics: AnalyticsData) {
  const tags = [
    `provider:${analytics.provider}`,
    `model:${analytics.model || "unknown"}`,
  ];

  dogstatsd.increment("neurolink.requests", 1, tags);
  dogstatsd.gauge("neurolink.tokens.input", analytics.tokenUsage.input, tags);
  dogstatsd.gauge("neurolink.tokens.output", analytics.tokenUsage.output, tags);
  dogstatsd.histogram("neurolink.latency", analytics.requestDuration, tags);

  if (analytics.cost !== undefined) {
    dogstatsd.gauge("neurolink.cost", analytics.cost, tags);
  }
}
```

### Custom Logging

Structured logging with analytics:

```typescript
import pino from "pino";

const logger = pino({
  level: "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
});

async function loggedGenerate(options: GenerateOptions) {
  const result = await neurolink.generate({
    ...options,
    enableAnalytics: true,
  });

  logger.info(
    {
      provider: result.analytics?.provider,
      model: result.analytics?.model,
      tokens: {
        input: result.analytics?.tokenUsage.input,
        output: result.analytics?.tokenUsage.output,
        total: result.analytics?.tokenUsage.total,
      },
      cost: result.analytics?.cost,
      duration: result.analytics?.requestDuration,
      timestamp: result.analytics?.timestamp,
    },
    "AI generation completed",
  );

  return result;
}
```

## Usage Statistics

### Tracking Usage Over Time

Build usage dashboards with aggregated statistics:

```typescript
type UsageStats = {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  byProvider: Map<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
    }
  >;
  byModel: Map<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
    }
  >;
};

class UsageTracker {
  private stats: UsageStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    averageLatency: 0,
    byProvider: new Map(),
    byModel: new Map(),
  };
  private latencies: number[] = [];

  record(analytics: AnalyticsData) {
    this.stats.totalRequests++;
    this.stats.totalTokens += analytics.tokenUsage.total;
    this.stats.totalCost += analytics.cost || 0;
    this.latencies.push(analytics.requestDuration);
    this.stats.averageLatency =
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

    // Track by provider
    const providerStats = this.stats.byProvider.get(analytics.provider) || {
      requests: 0,
      tokens: 0,
      cost: 0,
    };
    providerStats.requests++;
    providerStats.tokens += analytics.tokenUsage.total;
    providerStats.cost += analytics.cost || 0;
    this.stats.byProvider.set(analytics.provider, providerStats);

    // Track by model
    if (analytics.model) {
      const modelStats = this.stats.byModel.get(analytics.model) || {
        requests: 0,
        tokens: 0,
        cost: 0,
      };
      modelStats.requests++;
      modelStats.tokens += analytics.tokenUsage.total;
      modelStats.cost += analytics.cost || 0;
      this.stats.byModel.set(analytics.model, modelStats);
    }
  }

  getStats(): UsageStats {
    return { ...this.stats };
  }

  getSummary(): string {
    return `
      Total Requests: ${this.stats.totalRequests}
      Total Tokens: ${this.stats.totalTokens.toLocaleString()}
      Total Cost: $${this.stats.totalCost.toFixed(4)}
      Average Latency: ${this.stats.averageLatency.toFixed(0)}ms
    `;
  }
}
```

### Rate Limiting Based on Usage

Implement rate limiting using analytics:

```typescript
class UsageRateLimiter {
  private tokenBudget: number;
  private costBudget: number;
  private usedTokens = 0;
  private usedCost = 0;
  private resetInterval: NodeJS.Timeout;

  constructor(
    options: {
      tokenBudget?: number;
      costBudget?: number;
      resetIntervalMs?: number;
    } = {},
  ) {
    this.tokenBudget = options.tokenBudget || 1_000_000;
    this.costBudget = options.costBudget || 10;

    // Reset budgets periodically
    this.resetInterval = setInterval(() => {
      this.usedTokens = 0;
      this.usedCost = 0;
    }, options.resetIntervalMs || 3600000); // 1 hour default
  }

  canProceed(estimatedTokens: number): boolean {
    return this.usedTokens + estimatedTokens <= this.tokenBudget;
  }

  record(analytics: AnalyticsData) {
    this.usedTokens += analytics.tokenUsage.total;
    this.usedCost += analytics.cost || 0;
  }

  getRemainingBudget(): { tokens: number; cost: number } {
    return {
      tokens: this.tokenBudget - this.usedTokens,
      cost: this.costBudget - this.usedCost,
    };
  }

  destroy() {
    clearInterval(this.resetInterval);
  }
}
```

## CLI Analytics

### Viewing Analytics in CLI

```bash
# Generate with analytics enabled
neurolink generate "Hello world" --enableAnalytics

# Output includes analytics summary
# Tokens: 15 input / 25 output / 40 total
# Cost: $0.00003
# Time: 1.2s
```

### Verbose Analytics

```bash
# Detailed analytics output
neurolink generate "Explain AI" --enableAnalytics --verbose

# Shows full analytics breakdown including:
# - Token usage by type
# - Cost breakdown
# - Response time
# - Provider/model info
```

## Best Practices

### 1. Always Enable Analytics in Production

```typescript
const neurolink = new NeuroLink({
  // Default analytics enabled for all requests
  defaultOptions: {
    enableAnalytics: true,
  },
});
```

### 2. Monitor Cost Alerts

```typescript
const COST_ALERT_THRESHOLD = 0.1; // $0.10 per request

async function monitoredGenerate(options: GenerateOptions) {
  const result = await neurolink.generate({
    ...options,
    enableAnalytics: true,
  });

  if (result.analytics?.cost && result.analytics.cost > COST_ALERT_THRESHOLD) {
    console.warn(
      `High cost alert: $${result.analytics.cost.toFixed(4)} for request`,
    );
  }

  return result;
}
```

### 3. Track Token Efficiency

```typescript
function calculateEfficiency(analytics: AnalyticsData): number {
  // Ratio of output tokens to total tokens
  const { input, output, total } = analytics.tokenUsage;
  return total > 0 ? output / total : 0;
}
```

### 4. Implement Budget Controls

```typescript
class BudgetController {
  private dailyBudget: number;
  private spent = 0;

  constructor(dailyBudget: number) {
    this.dailyBudget = dailyBudget;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    if (this.spent >= this.dailyBudget) {
      throw new Error("Daily budget exceeded");
    }

    const result = await neurolink.generate({
      ...options,
      enableAnalytics: true,
    });

    this.spent += result.analytics?.cost || 0;
    return result;
  }
}
```

## Related Documentation

- [Configuration Reference](configuration.md) - Configure analytics settings
- [Provider Comparison](provider-comparison.md) - Compare provider costs
- [Troubleshooting](troubleshooting.md) - Debug analytics issues
- [Error Codes](error-codes.md) - Analytics-related error codes
