/**
 * Analytics-related type definitions for NeuroLink
 * Comprehensive usage tracking, performance metrics, and cost analysis types
 */

import type { JsonValue, UnknownRecord } from "./common.js";

/**
 * Token usage information (consolidated from multiple sources)
 */
export type TokenUsage = {
  input: number;
  output: number;
  total: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  reasoning?: number;
  cacheSavingsPercent?: number;
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
