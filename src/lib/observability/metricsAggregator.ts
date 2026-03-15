/**
 * Metrics Aggregator
 * Comprehensive metrics aggregation with latency percentiles, token usage, and cost tracking
 */

import type { TokenUsageStats } from "./tokenTracker.js";
import { TokenTracker } from "./tokenTracker.js";
import type { SpanData } from "./types/spanTypes.js";

/**
 * Latency statistics with percentile calculations
 */
export type LatencyStats = {
  /** Minimum latency in milliseconds */
  min: number;
  /** Maximum latency in milliseconds */
  max: number;
  /** Mean/average latency in milliseconds */
  mean: number;
  /** Median latency (p50) in milliseconds */
  median: number;
  /** 50th percentile latency in milliseconds */
  p50: number;
  /** 75th percentile latency in milliseconds */
  p75: number;
  /** 90th percentile latency in milliseconds */
  p90: number;
  /** 95th percentile latency in milliseconds */
  p95: number;
  /** 99th percentile latency in milliseconds */
  p99: number;
  /** Standard deviation in milliseconds */
  stdDev: number;
  /** Total number of samples */
  count: number;
};

/**
 * Cost breakdown by provider
 */
export type ProviderCostStats = {
  provider: string;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
  inputCost: number;
  outputCost: number;
};

/**
 * Cost breakdown by model
 */
export type ModelCostStats = {
  model: string;
  provider: string;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
};

/**
 * Time window statistics
 */
export type TimeWindowStats = {
  windowStart: Date;
  windowEnd: Date;
  windowDurationMs: number;
  requestCount: number;
  errorCount: number;
  successRate: number;
  throughput: number; // requests per second
  latency: LatencyStats;
  tokens: TokenUsageStats;
  costByProvider: Map<string, ProviderCostStats>;
  costByModel: Map<string, ModelCostStats>;
};

/**
 * Aggregated metrics summary
 */
export type MetricsSummary = {
  /** Total number of spans tracked */
  totalSpans: number;
  /** Number of successful spans */
  successfulSpans: number;
  /** Number of failed spans */
  failedSpans: number;
  /** Overall success rate (0-1) */
  successRate: number;
  /** Latency statistics */
  latency: LatencyStats;
  /** Token usage statistics */
  tokens: TokenUsageStats;
  /** Cost by provider */
  costByProvider: ProviderCostStats[];
  /** Cost by model */
  costByModel: ModelCostStats[];
  /** Total cost across all providers */
  totalCost: number;
  /** Span count by type */
  spansByType: Record<string, number>;
  /** Timestamp of first span */
  firstSpanTime?: Date;
  /** Timestamp of last span */
  lastSpanTime?: Date;
  /** Tracking duration in milliseconds */
  trackingDurationMs?: number;
};

/**
 * Hierarchical trace view grouping related spans
 */
export type TraceView = {
  /** Trace identifier shared by all spans in this trace */
  traceId: string;
  /** The root/parent span of this trace */
  rootSpan: SpanData;
  /** Child spans linked to the root */
  childSpans: SpanData[];
  /** Total duration from first to last span */
  totalDurationMs: number;
  /** Total number of spans in this trace */
  spanCount: number;
  /** Overall trace status */
  status: "ok" | "error" | "partial";
};

/**
 * Configuration for the metrics aggregator
 */
export type MetricsAggregatorConfig = {
  /** Maximum spans to retain in memory */
  maxSpansRetained?: number;
  /** Enable time-window statistics */
  enableTimeWindows?: boolean;
  /** Time window size in milliseconds (default: 60000 = 1 minute) */
  timeWindowMs?: number;
  /** Maximum time windows to retain */
  maxTimeWindows?: number;
};

/**
 * Metrics Aggregator for comprehensive telemetry analysis
 * Provides latency percentiles, token aggregation, and cost tracking
 */
export class MetricsAggregator {
  private spans: SpanData[] = [];
  private latencyValues: number[] = [];
  private tokenTracker: TokenTracker;
  private timeWindows: Map<number, TimeWindowStats> = new Map();
  private config: Required<MetricsAggregatorConfig>;

  private spansByType: Map<string, number> = new Map();
  private costByProvider: Map<string, ProviderCostStats> = new Map();
  private costByModel: Map<string, ModelCostStats> = new Map();

  private successCount = 0;
  private failureCount = 0;
  private firstSpanTime?: Date;
  private lastSpanTime?: Date;

  constructor(config: MetricsAggregatorConfig = {}) {
    this.config = {
      maxSpansRetained: config.maxSpansRetained ?? 10000,
      enableTimeWindows: config.enableTimeWindows ?? true,
      timeWindowMs: config.timeWindowMs ?? 60000, // 1 minute default
      maxTimeWindows: config.maxTimeWindows ?? 60, // 1 hour of 1-minute windows
    };
    this.tokenTracker = new TokenTracker();
  }

  /**
   * Record a span for metrics aggregation
   */
  recordSpan(span: SpanData): void {
    // Enforce maximum spans limit
    if (this.spans.length >= this.config.maxSpansRetained) {
      const evicted = this.spans.shift(); // Remove oldest span
      // Only trim latencyValues when the evicted span had a duration recorded
      if (evicted?.durationMs !== undefined) {
        this.latencyValues.shift();
      }
      // Note: We keep aggregated metrics, only raw spans and latency values are trimmed
    }

    this.spans.push(span);

    // Update timestamps
    const spanTime = new Date(span.startTime);
    if (!this.firstSpanTime || spanTime < this.firstSpanTime) {
      this.firstSpanTime = spanTime;
    }
    if (!this.lastSpanTime || spanTime > this.lastSpanTime) {
      this.lastSpanTime = spanTime;
    }

    // Track latency if duration is available
    if (span.durationMs !== undefined) {
      this.latencyValues.push(span.durationMs);
    }

    // Track success/failure
    if (span.status === 2) {
      // SpanStatus.ERROR = 2
      this.failureCount++;
    } else {
      this.successCount++;
    }

    // Track by span type
    const currentCount = this.spansByType.get(span.type) ?? 0;
    this.spansByType.set(span.type, currentCount + 1);

    // Track tokens via TokenTracker
    this.tokenTracker.trackSpan(span);

    // Track cost by provider and model
    this.trackCosts(span);

    // Update time window if enabled
    if (this.config.enableTimeWindows) {
      this.updateTimeWindow(span);
    }
  }

  /**
   * Track cost aggregations from a span
   */
  private trackCosts(span: SpanData): void {
    const attrs = span.attributes;
    const provider = attrs["ai.provider"] as string;
    const model = attrs["ai.model"] as string;
    const inputCost = (attrs["ai.cost.input"] as number) ?? 0;
    const outputCost = (attrs["ai.cost.output"] as number) ?? 0;
    const totalCost =
      (attrs["ai.cost.total"] as number) ?? inputCost + outputCost;
    const inputTokens = (attrs["ai.tokens.input"] as number) ?? 0;
    const outputTokens = (attrs["ai.tokens.output"] as number) ?? 0;

    // Update provider costs
    if (provider) {
      const existing = this.costByProvider.get(provider) ?? {
        provider,
        totalCost: 0,
        requestCount: 0,
        avgCostPerRequest: 0,
        inputCost: 0,
        outputCost: 0,
      };
      existing.totalCost += totalCost;
      existing.requestCount += 1;
      existing.avgCostPerRequest = existing.totalCost / existing.requestCount;
      existing.inputCost += inputCost;
      existing.outputCost += outputCost;
      this.costByProvider.set(provider, existing);
    }

    // Update model costs
    if (model) {
      const existing = this.costByModel.get(model) ?? {
        model,
        provider: provider ?? "unknown",
        totalCost: 0,
        requestCount: 0,
        avgCostPerRequest: 0,
        inputTokens: 0,
        outputTokens: 0,
        inputCost: 0,
        outputCost: 0,
      };
      existing.totalCost += totalCost;
      existing.requestCount += 1;
      existing.avgCostPerRequest = existing.totalCost / existing.requestCount;
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.inputCost += inputCost;
      existing.outputCost += outputCost;
      this.costByModel.set(model, existing);
    }
  }

  /**
   * Update time window statistics
   */
  private updateTimeWindow(span: SpanData): void {
    const spanTime = new Date(span.startTime).getTime();
    const windowKey =
      Math.floor(spanTime / this.config.timeWindowMs) *
      this.config.timeWindowMs;

    // Enforce maximum time windows
    if (
      this.timeWindows.size >= this.config.maxTimeWindows &&
      !this.timeWindows.has(windowKey)
    ) {
      // Remove oldest window
      const oldestKey = Math.min(...Array.from(this.timeWindows.keys()));
      this.timeWindows.delete(oldestKey);
    }

    let window = this.timeWindows.get(windowKey);
    if (!window) {
      window = this.createEmptyTimeWindow(windowKey);
      this.timeWindows.set(windowKey, window);
    }

    // Update window stats
    window.requestCount++;
    if (span.status === 2) {
      window.errorCount++;
    }
    window.successRate =
      (window.requestCount - window.errorCount) / window.requestCount;
    window.throughput = window.requestCount / (window.windowDurationMs / 1000);

    // Update window end time
    const spanEndTime = new Date(span.endTime ?? span.startTime);
    if (spanEndTime > window.windowEnd) {
      window.windowEnd = spanEndTime;
    }
  }

  /**
   * Create an empty time window
   */
  private createEmptyTimeWindow(windowKey: number): TimeWindowStats {
    return {
      windowStart: new Date(windowKey),
      windowEnd: new Date(windowKey + this.config.timeWindowMs),
      windowDurationMs: this.config.timeWindowMs,
      requestCount: 0,
      errorCount: 0,
      successRate: 1,
      throughput: 0,
      latency: this.createEmptyLatencyStats(),
      tokens: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        reasoningTokens: 0,
        totalCost: 0,
        byProvider: new Map(),
        byModel: new Map(),
        bySpanType: new Map(),
      },
      costByProvider: new Map(),
      costByModel: new Map(),
    };
  }

  /**
   * Create empty latency stats
   */
  private createEmptyLatencyStats(): LatencyStats {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      count: 0,
    };
  }

  /**
   * Calculate latency percentile from sorted array
   */
  private calculatePercentile(
    sortedValues: number[],
    percentile: number,
  ): number {
    if (sortedValues.length === 0) {
      return 0;
    }
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)] ?? 0;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length < 2) {
      return 0;
    }
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    const avgSquaredDiff =
      squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Get comprehensive latency statistics
   */
  getLatencyStats(): LatencyStats {
    if (this.latencyValues.length === 0) {
      return this.createEmptyLatencyStats();
    }

    const sorted = [...this.latencyValues].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;

    return {
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      mean,
      median: this.calculatePercentile(sorted, 50),
      p50: this.calculatePercentile(sorted, 50),
      p75: this.calculatePercentile(sorted, 75),
      p90: this.calculatePercentile(sorted, 90),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      stdDev: this.calculateStdDev(sorted, mean),
      count: sorted.length,
    };
  }

  /**
   * Get token usage statistics
   */
  getTokenStats(): TokenUsageStats {
    return this.tokenTracker.getStats();
  }

  /**
   * Get cost breakdown by provider
   */
  getCostByProvider(): ProviderCostStats[] {
    return Array.from(this.costByProvider.values());
  }

  /**
   * Get cost breakdown by model
   */
  getCostByModel(): ModelCostStats[] {
    return Array.from(this.costByModel.values());
  }

  /**
   * Get total cost across all providers
   */
  getTotalCost(): number {
    let total = 0;
    const providerStatsArray = Array.from(this.costByProvider.values());
    for (const stats of providerStatsArray) {
      total += stats.totalCost;
    }
    return total;
  }

  /**
   * Get time window statistics
   */
  getTimeWindows(): TimeWindowStats[] {
    return Array.from(this.timeWindows.values()).sort(
      (a, b) => a.windowStart.getTime() - b.windowStart.getTime(),
    );
  }

  /**
   * Get statistics for a specific time range
   */
  getStatsForTimeRange(startTime: Date, endTime: Date): TimeWindowStats {
    const relevantSpans = this.spans.filter((span) => {
      const spanTime = new Date(span.startTime);
      return spanTime >= startTime && spanTime <= endTime;
    });

    // Create a temporary aggregator for this time range
    const tempAggregator = new MetricsAggregator({
      enableTimeWindows: false,
    });

    for (const span of relevantSpans) {
      tempAggregator.recordSpan(span);
    }

    const summary = tempAggregator.getSummary();
    const durationMs = endTime.getTime() - startTime.getTime();

    return {
      windowStart: startTime,
      windowEnd: endTime,
      windowDurationMs: durationMs,
      requestCount: summary.totalSpans,
      errorCount: summary.failedSpans,
      successRate: summary.successRate,
      throughput: summary.totalSpans / (durationMs / 1000),
      latency: summary.latency,
      tokens: summary.tokens,
      costByProvider: new Map(
        summary.costByProvider.map((p) => [p.provider, p]),
      ),
      costByModel: new Map(summary.costByModel.map((m) => [m.model, m])),
    };
  }

  /**
   * Record a latency measurement for an operation
   * Use this for standalone latency tracking without a full span
   */
  recordLatency(operation: string, latencyMs: number): void {
    this.latencyValues.push(latencyMs);

    // Track by operation type (similar to span type)
    const currentCount = this.spansByType.get(operation) ?? 0;
    this.spansByType.set(operation, currentCount + 1);

    // Update timestamps
    const now = new Date();
    if (!this.firstSpanTime) {
      this.firstSpanTime = now;
    }
    this.lastSpanTime = now;

    // Increment success count (standalone latency records are assumed successful)
    this.successCount++;
  }

  /**
   * Get comprehensive metrics summary (alias for getSummary)
   */
  getMetrics(): MetricsSummary {
    return this.getSummary();
  }

  /**
   * Get comprehensive metrics summary
   */
  getSummary(): MetricsSummary {
    const totalSpans = this.successCount + this.failureCount;

    return {
      totalSpans,
      successfulSpans: this.successCount,
      failedSpans: this.failureCount,
      successRate: totalSpans > 0 ? this.successCount / totalSpans : 1,
      latency: this.getLatencyStats(),
      tokens: this.getTokenStats(),
      costByProvider: this.getCostByProvider(),
      costByModel: this.getCostByModel(),
      totalCost: this.getTotalCost(),
      spansByType: Object.fromEntries(this.spansByType),
      firstSpanTime: this.firstSpanTime,
      lastSpanTime: this.lastSpanTime,
      trackingDurationMs:
        this.firstSpanTime && this.lastSpanTime
          ? this.lastSpanTime.getTime() - this.firstSpanTime.getTime()
          : undefined,
    };
  }

  /**
   * Get all recorded spans (returns a copy)
   */
  getSpans(): SpanData[] {
    return [...this.spans];
  }

  /**
   * Get spans grouped by traceId as hierarchical trace views
   */
  getTraces(): TraceView[] {
    const traceMap = new Map<string, SpanData[]>();
    for (const span of this.spans) {
      const existing = traceMap.get(span.traceId) || [];
      existing.push(span);
      traceMap.set(span.traceId, existing);
    }

    const traces: TraceView[] = [];
    for (const [traceId, spans] of traceMap) {
      // Root span is the one with no parentSpanId, or first span if all have parents
      const rootSpan = spans.find((s) => !s.parentSpanId) || spans[0];
      const childSpans = spans.filter((s) => s !== rootSpan);

      // Calculate total duration
      let totalDurationMs = 0;
      for (const s of spans) {
        if (s.durationMs) {
          totalDurationMs = Math.max(totalDurationMs, s.durationMs);
        }
      }

      // Determine status
      const hasError = spans.some((s) => s.status === 2); // SpanStatus.ERROR
      const allOk = spans.every((s) => s.status === 1); // SpanStatus.OK
      const status = hasError
        ? ("error" as const)
        : allOk
          ? ("ok" as const)
          : ("partial" as const);

      traces.push({
        traceId,
        rootSpan,
        childSpans,
        totalDurationMs,
        spanCount: spans.length,
        status,
      });
    }

    return traces;
  }

  /**
   * Get the underlying token tracker for custom pricing configuration
   */
  getTokenTracker(): TokenTracker {
    return this.tokenTracker;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.spans = [];
    this.latencyValues = [];
    this.tokenTracker.reset();
    this.timeWindows.clear();
    this.spansByType.clear();
    this.costByProvider.clear();
    this.costByModel.clear();
    this.successCount = 0;
    this.failureCount = 0;
    this.firstSpanTime = undefined;
    this.lastSpanTime = undefined;
  }

  /**
   * Export metrics as JSON
   */
  toJSON(): Record<string, unknown> {
    const summary = this.getSummary();
    return {
      totalSpans: summary.totalSpans,
      successfulSpans: summary.successfulSpans,
      failedSpans: summary.failedSpans,
      successRate: summary.successRate,
      latency: summary.latency,
      tokens: this.tokenTracker.toJSON(),
      costByProvider: summary.costByProvider,
      costByModel: summary.costByModel,
      totalCost: summary.totalCost,
      spansByType: summary.spansByType,
      firstSpanTime: summary.firstSpanTime?.toISOString(),
      lastSpanTime: summary.lastSpanTime?.toISOString(),
      trackingDurationMs: summary.trackingDurationMs,
      timeWindows: this.config.enableTimeWindows
        ? this.getTimeWindows().map((w) => ({
            windowStart: w.windowStart.toISOString(),
            windowEnd: w.windowEnd.toISOString(),
            requestCount: w.requestCount,
            errorCount: w.errorCount,
            successRate: w.successRate,
            throughput: w.throughput,
          }))
        : undefined,
    };
  }

  /**
   * Format cost as currency string
   */
  formatCost(cost: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 4,
    }).format(cost);
  }

  /**
   * Get a formatted summary string
   */
  getFormattedSummary(): string {
    const summary = this.getSummary();
    const latency = summary.latency;

    const lines = [
      "=== Metrics Summary ===",
      "",
      "Request Statistics:",
      `  Total requests: ${summary.totalSpans.toLocaleString()}`,
      `  Successful: ${summary.successfulSpans.toLocaleString()}`,
      `  Failed: ${summary.failedSpans.toLocaleString()}`,
      `  Success rate: ${(summary.successRate * 100).toFixed(2)}%`,
      "",
      "Latency (ms):",
      `  Min: ${latency.min.toFixed(2)}`,
      `  Max: ${latency.max.toFixed(2)}`,
      `  Mean: ${latency.mean.toFixed(2)}`,
      `  P50: ${latency.p50.toFixed(2)}`,
      `  P95: ${latency.p95.toFixed(2)}`,
      `  P99: ${latency.p99.toFixed(2)}`,
      "",
      "Token Usage:",
      `  Input tokens: ${summary.tokens.totalInputTokens.toLocaleString()}`,
      `  Output tokens: ${summary.tokens.totalOutputTokens.toLocaleString()}`,
      `  Total tokens: ${summary.tokens.totalTokens.toLocaleString()}`,
      "",
      "Cost:",
      `  Total: ${this.formatCost(summary.totalCost)}`,
    ];

    // Add cost by provider
    if (summary.costByProvider.length > 0) {
      lines.push("");
      lines.push("Cost by Provider:");
      for (const providerCost of summary.costByProvider) {
        lines.push(
          `  ${providerCost.provider}: ${this.formatCost(providerCost.totalCost)} (${providerCost.requestCount} requests)`,
        );
      }
    }

    // Add cost by model
    if (summary.costByModel.length > 0) {
      lines.push("");
      lines.push("Cost by Model:");
      for (const modelCost of summary.costByModel) {
        lines.push(
          `  ${modelCost.model}: ${this.formatCost(modelCost.totalCost)} (${modelCost.requestCount} requests)`,
        );
      }
    }

    // Add tracking duration
    if (summary.trackingDurationMs) {
      const durationSec = summary.trackingDurationMs / 1000;
      const throughput = summary.totalSpans / durationSec;
      lines.push("");
      lines.push(
        `Tracking duration: ${durationSec.toFixed(1)}s (${throughput.toFixed(2)} req/s)`,
      );
    }

    return lines.join("\n");
  }
}

/**
 * Global metrics aggregator instance (singleton pattern from main)
 */
let globalMetricsAggregator: MetricsAggregator | null = null;

/**
 * Get the global metrics aggregator instance
 */
export function getMetricsAggregator(): MetricsAggregator {
  if (!globalMetricsAggregator) {
    globalMetricsAggregator = new MetricsAggregator();
  }
  return globalMetricsAggregator;
}

/**
 * Reset the global metrics aggregator (for testing)
 */
export function resetMetricsAggregator(): void {
  if (globalMetricsAggregator) {
    globalMetricsAggregator.reset();
  }
  globalMetricsAggregator = null;
}
