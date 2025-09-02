/**
 * Evaluation provider type definitions for NeuroLink
 * Provider performance tracking, evaluation configurations, and provider optimization types
 */

/**
 * Performance optimization priority
 */
export type PerformancePriority = "speed" | "cost" | "reliability";

/**
 * Legacy provider model configuration for evaluation
 */
export type ProviderModelConfig = {
  provider: string;
  models: string[];
  costPerToken?: number | { input: number; output: number };
  requiresApiKey?: string[];
  performance?: {
    averageLatency?: number;
    reliability?: number;
    speed?: number;
    quality?: number;
    cost?: number;
  };
};

/**
 * Real-time provider performance tracking metrics
 */
export type ProviderPerformanceMetrics = {
  responseTime: number[];
  successRate: number;
  tokenThroughput: number;
  costEfficiency: number;
  lastUpdated: Date;
  sampleCount: number;
};

/**
 * Provider performance recording data
 */
export type ProviderPerformanceData = {
  responseTime: number;
  tokensGenerated: number;
  cost: number;
  success: boolean;
};

/**
 * Provider performance analytics result
 */
export type ProviderPerformanceAnalytics = {
  avgResponseTime: number;
  successRate: number;
  tokenThroughput: number;
  costEfficiency: number;
  recommendation: string;
  sampleCount: number;
};

/**
 * Performance thresholds for evaluation
 */
export type PerformanceThresholds = {
  EXCELLENT_SUCCESS_RATE: number;
  EXCELLENT_RESPONSE_TIME_MS: number;
  GOOD_SUCCESS_RATE: number;
  FAIR_SUCCESS_RATE: number;
};

/**
 * Provider scoring result
 */
export type ProviderScoringResult = {
  provider: ProviderModelConfig;
  score: number;
  metrics: ProviderPerformanceMetrics | null;
};

/**
 * Provider availability status
 */
export type ProviderAvailabilityStatus = {
  provider: string;
  available: boolean;
  reason?: string;
  lastChecked: Date;
};

/**
 * Provider cost estimation parameters
 */
export type CostEstimationParams = {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  model?: string;
};

/**
 * Provider selection criteria
 */
export type ProviderSelectionCriteria = {
  priority: PerformancePriority;
  maxCost?: number;
  minSuccessRate?: number;
  maxResponseTime?: number;
  excludeProviders?: string[];
  requireCapabilities?: string[];
};
