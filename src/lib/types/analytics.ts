/**
 * Analytics-related type definitions for NeuroLink
 * Comprehensive usage tracking, performance metrics, and cost analysis types
 */

import type { JsonValue, UnknownRecord } from "./common.js";
import type { ClaudeLimitSnapshot } from "./subscription.js";

/**
 * Token usage information (consolidated from multiple sources)
 */
export type TokenUsage = {
  input: number;
  output: number;
  total: number;
  cacheCreationTokens?: number;
  /**
   * The 1-hour-TTL share of `cacheCreationTokens` (a subset, not additive —
   * Anthropic's `cache_creation.ephemeral_1h_input_tokens` is reported inside
   * the same `cache_creation_input_tokens` total). Undefined/0 keeps today's
   * pricing exactly, since `calculateCost` treats every write as 5-minute-TTL
   * unless told otherwise.
   */
  cacheCreation1hTokens?: number;
  cacheReadTokens?: number;
  reasoning?: number;
  cacheSavingsPercent?: number;
};

/** Per-token dollar rates for one model in the pricing table. */
export type ModelPricingRates = {
  input: number;
  output: number;
  cacheRead?: number;
  cacheCreation?: number;
  /**
   * 1-hour TTL cache-write rate (Anthropic's 2x-of-input multiplier),
   * separate from `cacheCreation`'s 5-minute (1.25x) rate so a 1h-TTL
   * write is never silently priced at the 5m rate. `calculateCost()`
   * applies it to `TokenUsage.cacheCreation1hTokens`, the 1h share of the
   * cache-write total that the Claude route, the Vertex passthrough and
   * the Codex outbound fallback capture. Set on every Claude model; a
   * model without it prices that share at `cacheCreation`.
   */
  cacheCreation1h?: number;
};

/**
 * Error info type for analytics
 */
export type AnalyticsErrorInfo = {
  message: string;
  code?: string | number;
  stack?: string;
  details?: UnknownRecord;
};

/**
 * Analytics data structure (consolidated from core analytics)
 */
export type AnalyticsData = {
  provider: string;
  model?: string;
  tokenUsage: TokenUsage;
  requestDuration: number;
  timestamp: string;
  cost?: number;
  context?: JsonValue;
  // Turn-lifecycle telemetry (populated when the provider ran a native
  // agentic loop — Vertex Gemini/Claude) so an RCA is a one-line query:
  /** Number of agentic steps (model calls) the turn used. */
  stepsUsed?: number;
  /** Number of external tool calls the turn made (final_result excluded). */
  toolCallCount?: number;
  /** Why the turn ended — see GenerateStopReason. */
  stopReason?: string;
  /** Wall-clock duration of the turn in milliseconds. */
  elapsedMs?: number;
  /** Verbatim provider finish/stop reason for the terminal model call. */
  rawFinishReason?: string;
  /**
   * Account limit state observed on this request — subscription window
   * headroom, reset times, and (via the NeuroLink Claude proxy) which account
   * served it and how much the pool has left. Present for Anthropic traffic
   * whose response carried rate-limit headers.
   */
  limits?: ClaudeLimitSnapshot;
};

/**
 * Stream Analytics Data - Enhanced for performance tracking
 */
export type StreamAnalyticsData = {
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

export type PerformanceMetrics = {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryStart: NodeJS.MemoryUsage;
  memoryEnd?: NodeJS.MemoryUsage;
  memoryDelta?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
};

export type TimeRangeOption = {
  start: Date;
  end: Date;
};

/**
 * Quality score subset captured on an analytics telemetry record.
 */
export type AnalyticsQualityScore = {
  overall: number;
  relevance: number;
  accuracy: number;
  completeness: number;
  reasoning?: string;
};

/**
 * Single request lifecycle record for advanced analytics aggregation.
 */
export type TelemetryRecord = {
  id: string;
  provider: string;
  model: string;
  userId?: string;
  teamId?: string;
  department?: string;
  timestamp: number;
  latency: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  isError: boolean;
  errorMessage?: string;
  qualityScore?: AnalyticsQualityScore;
};

/**
 * Pluggable storage backend for analytics telemetry records.
 */
export type AnalyticsStorage = {
  /** Save a telemetry record */
  saveRecord(record: TelemetryRecord): Promise<void>;
  /** Retrieve all records */
  getRecords(): Promise<TelemetryRecord[]>;
  /** Clear storage */
  clear(): Promise<void>;
};

/**
 * Options for the bounded in-memory analytics storage backend.
 */
export type InMemoryAnalyticsStorageOptions = {
  /** Maximum records to retain. Oldest records are evicted when exceeded. */
  maxRecords?: number;
};

export type ProviderMetricsOptions = {
  providers?: string[];
  timeRange?: TimeRangeOption | string;
  metrics?: string[];
};

export type ProviderMetricItem = {
  name: string;
  averageLatency: number;
  averageResponseTime: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  errorRate: number;
  successRate: number;
  costPerToken: number;
  totalCost: number;
  requestCount: number;
};

export type ProviderMetricsResult = {
  averageLatency: number;
  averageResponseTime: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  errorRate: number;
  successRate: number;
  costPerToken: number;
  totalCost: number;
  requestCount: number;
  providers: ProviderMetricItem[];
};

export type CostAnalysisOptions = {
  timeRange?: TimeRangeOption | string;
  groupBy?: string | string[];
  includeProjections?: boolean;
};

export type CostGroupItem = {
  groupKey: string;
  provider?: string;
  model?: string;
  userId?: string;
  totalCost: number;
  costPerToken: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
};

export type CostAnalysisResult = {
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  groups: Record<string, CostGroupItem>;
  providers: CostGroupItem[];
  projections?: {
    nextMonth: number;
    nextQuarter: number;
  };
};

export type TeamAnalyticsOptions = {
  teamId?: string;
  departments?: string[];
  metrics?: string[];
  timeRange?: TimeRangeOption | string;
};

export type TeamAnalyticsResult = {
  totalRequests: number;
  uniqueUsers: number;
  providersUsed: string[];
  costBreakdownByProvider: Record<string, number>;
  costBreakdownByUser: Record<string, number>;
  qualityScores?: AnalyticsQualityScore;
};
