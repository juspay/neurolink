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
export type ErrorInfo = {
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
