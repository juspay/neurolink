/**
 * Generic Processor Telemetry
 * Provides reusable metrics and counters for monitoring any processing operations.
 *
 * Features:
 * - Processing time tracking (histogram)
 * - Success/failure counters
 * - Size distribution tracking (histogram)
 * - Flexible operation and provider tracking
 *
 * Can be used for image processing, PDF processing, CSV processing, etc.
 * Integrates with existing TelemetryService for OpenTelemetry support.
 *
 * @example
 * ```typescript
 * // For image processing
 * const imageTelemetry = new ProcessorTelemetry('image');
 *
 * // For PDF processing
 * const pdfTelemetry = new ProcessorTelemetry('pdf');
 *
 * // For CSV processing
 * const csvTelemetry = new ProcessorTelemetry('csv');
 * ```
 */

import { TelemetryService } from "./telemetryService.js";
import { logger } from "../utils/logger.js";

/**
 * Size bucket labels for histogram
 */
type SizeBucket = "tiny" | "small" | "medium" | "large" | "very_large" | "huge";

/**
 * Duration bucket labels for histogram
 */
type DurationBucket = "instant" | "fast" | "normal" | "slow" | "very_slow";

/**
 * Metrics for a single processing operation
 */
export interface ProcessingMetrics {
  operation: string;
  provider?: string;
  model?: string;
  dataSize: number;
  processingTimeMs: number;
  success: boolean;
  errorType?: string;
  mimeType?: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Aggregated statistics for processing operations
 */
export interface ProcessingStats {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageProcessingTimeMs: number;
  averageSizeBytes: number;
  sizeDistribution: Record<SizeBucket, number>;
  durationDistribution: Record<DurationBucket, number>;
  operationBreakdown: Record<string, number>;
  providerBreakdown: Record<string, number>;
  errorBreakdown: Record<string, number>;
}

/**
 * Generic Processor Telemetry class
 * Tracks metrics and provides monitoring for any type of processing operation.
 *
 * This class is designed to be reusable across different processors:
 * - Image processing
 * - PDF processing
 * - CSV processing
 * - Any other data processing operations
 */
export class ProcessorTelemetry {
  private telemetryService: TelemetryService;
  private readonly processorType: string;

  // Runtime metrics tracking
  private totalProcessed: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;
  private totalProcessingTime: number = 0;
  private totalSize: number = 0;

  // Distribution tracking
  private sizeDistribution: Record<SizeBucket, number> = {
    tiny: 0,
    small: 0,
    medium: 0,
    large: 0,
    very_large: 0,
    huge: 0,
  };

  private durationDistribution: Record<DurationBucket, number> = {
    instant: 0,
    fast: 0,
    normal: 0,
    slow: 0,
    very_slow: 0,
  };

  private operationBreakdown: Record<string, number> = {};
  private providerBreakdown: Record<string, number> = {};
  private errorBreakdown: Record<string, number> = {};

  /**
   * Create a new ProcessorTelemetry instance
   * @param processorType - Type of processor (e.g., 'image', 'pdf', 'csv')
   */
  constructor(processorType: string) {
    this.processorType = processorType;
    this.telemetryService = TelemetryService.getInstance();
  }

  /**
   * Record a processing operation
   */
  recordOperation(metrics: ProcessingMetrics): void {
    // Update counters
    this.totalProcessed++;
    if (metrics.success) {
      this.successCount++;
    } else {
      this.failureCount++;
      if (metrics.errorType) {
        this.errorBreakdown[metrics.errorType] =
          (this.errorBreakdown[metrics.errorType] || 0) + 1;
      }
    }

    // Update aggregates
    this.totalProcessingTime += metrics.processingTimeMs;
    this.totalSize += metrics.dataSize;

    // Update distributions
    this.sizeDistribution[this.getSizeBucket(metrics.dataSize)]++;
    this.durationDistribution[
      this.getDurationBucket(metrics.processingTimeMs)
    ]++;

    // Update operation breakdown
    this.operationBreakdown[metrics.operation] =
      (this.operationBreakdown[metrics.operation] || 0) + 1;

    // Update provider breakdown
    if (metrics.provider) {
      this.providerBreakdown[metrics.provider] =
        (this.providerBreakdown[metrics.provider] || 0) + 1;
    }

    // Record to OpenTelemetry if enabled
    this.recordToOpenTelemetry(metrics);

    // Log debug info
    logger.debug(
      `[${this.processorType}Telemetry] ${metrics.operation}: ${metrics.success ? "success" : "failure"} ` +
        `(${metrics.processingTimeMs}ms, ${this.formatSize(metrics.dataSize)})`,
    );
  }

  /**
   * Track a processing operation with automatic timing
   */
  async trackOperation<T>(
    operation: string,
    dataSize: number,
    fn: () => Promise<T>,
    options?: {
      provider?: string;
      model?: string;
      mimeType?: string;
      metadata?: Record<string, string | number | boolean>;
    },
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let errorType: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.name : "UnknownError";
      throw error;
    } finally {
      const processingTimeMs = performance.now() - startTime;
      this.recordOperation({
        operation,
        provider: options?.provider,
        model: options?.model,
        dataSize,
        processingTimeMs,
        success,
        errorType,
        mimeType: options?.mimeType,
        metadata: options?.metadata,
      });
    }
  }

  /**
   * Track a synchronous processing operation with automatic timing
   */
  trackSync<T>(
    operation: string,
    dataSize: number,
    fn: () => T,
    options?: {
      provider?: string;
      model?: string;
      mimeType?: string;
      metadata?: Record<string, string | number | boolean>;
    },
  ): T {
    const startTime = performance.now();
    let success = true;
    let errorType: string | undefined;

    try {
      const result = fn();
      return result;
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.name : "UnknownError";
      throw error;
    } finally {
      const processingTimeMs = performance.now() - startTime;
      this.recordOperation({
        operation,
        provider: options?.provider,
        model: options?.model,
        dataSize,
        processingTimeMs,
        success,
        errorType,
        mimeType: options?.mimeType,
        metadata: options?.metadata,
      });
    }
  }

  /**
   * Get current statistics
   */
  getStats(): ProcessingStats {
    const successRate =
      this.totalProcessed > 0
        ? (this.successCount / this.totalProcessed) * 100
        : 0;

    const averageProcessingTimeMs =
      this.totalProcessed > 0
        ? this.totalProcessingTime / this.totalProcessed
        : 0;

    const averageSizeBytes =
      this.totalProcessed > 0 ? this.totalSize / this.totalProcessed : 0;

    return {
      totalProcessed: this.totalProcessed,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTimeMs: Math.round(averageProcessingTimeMs * 100) / 100,
      averageSizeBytes: Math.round(averageSizeBytes),
      sizeDistribution: { ...this.sizeDistribution },
      durationDistribution: { ...this.durationDistribution },
      operationBreakdown: { ...this.operationBreakdown },
      providerBreakdown: { ...this.providerBreakdown },
      errorBreakdown: { ...this.errorBreakdown },
    };
  }

  /**
   * Reset all statistics (useful for testing or periodic resets)
   */
  reset(): void {
    this.totalProcessed = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.totalProcessingTime = 0;
    this.totalSize = 0;

    this.sizeDistribution = {
      tiny: 0,
      small: 0,
      medium: 0,
      large: 0,
      very_large: 0,
      huge: 0,
    };

    this.durationDistribution = {
      instant: 0,
      fast: 0,
      normal: 0,
      slow: 0,
      very_slow: 0,
    };

    this.operationBreakdown = {};
    this.providerBreakdown = {};
    this.errorBreakdown = {};

    logger.debug(`[${this.processorType}Telemetry] Statistics reset`);
  }

  /**
   * Record metrics to OpenTelemetry
   */
  private recordToOpenTelemetry(metrics: ProcessingMetrics): void {
    const labels: Record<string, string> = {
      processor_type: this.processorType,
      operation: metrics.operation,
      success: metrics.success.toString(),
    };

    if (metrics.provider) {
      labels.provider = metrics.provider;
    }
    if (metrics.mimeType) {
      labels.mime_type = metrics.mimeType;
    }
    if (metrics.errorType) {
      labels.error_type = metrics.errorType;
    }
    if (metrics.metadata) {
      for (const [key, value] of Object.entries(metrics.metadata)) {
        labels[`meta_${key}`] = String(value);
      }
    }

    // Record processing time histogram
    this.telemetryService.recordCustomHistogram(
      `${this.processorType}_processing_duration_ms`,
      metrics.processingTimeMs,
      labels,
    );

    // Record size histogram
    this.telemetryService.recordCustomHistogram(
      `${this.processorType}_processing_size_bytes`,
      metrics.dataSize,
      labels,
    );

    // Record success/failure counter
    this.telemetryService.recordCustomMetric(
      `${this.processorType}_processing_operations`,
      1,
      labels,
    );
  }

  /**
   * Get size bucket for distribution tracking
   */
  private getSizeBucket(bytes: number): SizeBucket {
    if (bytes < 10 * 1024) {
      return "tiny"; // < 10KB
    }
    if (bytes < 100 * 1024) {
      return "small"; // 10KB - 100KB
    }
    if (bytes < 500 * 1024) {
      return "medium"; // 100KB - 500KB
    }
    if (bytes < 1024 * 1024) {
      return "large"; // 500KB - 1MB
    }
    if (bytes < 5 * 1024 * 1024) {
      return "very_large"; // 1MB - 5MB
    }
    return "huge"; // > 5MB
  }

  /**
   * Get duration bucket for distribution tracking
   */
  private getDurationBucket(ms: number): DurationBucket {
    if (ms < 1) {
      return "instant"; // < 1ms
    }
    if (ms < 10) {
      return "fast"; // 1ms - 10ms
    }
    if (ms < 100) {
      return "normal"; // 10ms - 100ms
    }
    if (ms < 500) {
      return "slow"; // 100ms - 500ms
    }
    return "very_slow"; // > 500ms
  }

  /**
   * Format size in human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes}B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

/**
 * Singleton registry for processor telemetry instances
 * Ensures consistent telemetry tracking across the application
 */
export class ProcessorTelemetryRegistry {
  private static instances: Map<string, ProcessorTelemetry> = new Map();

  /**
   * Get or create a telemetry instance for a specific processor type
   * @param processorType - Type of processor (e.g., 'image', 'pdf', 'csv')
   */
  static getInstance(processorType: string): ProcessorTelemetry {
    if (!this.instances.has(processorType)) {
      this.instances.set(processorType, new ProcessorTelemetry(processorType));
    }
    return this.instances.get(processorType)!;
  }

  /**
   * Get all registered telemetry instances
   */
  static getAllInstances(): Map<string, ProcessorTelemetry> {
    return new Map(this.instances);
  }

  /**
   * Reset all telemetry instances
   */
  static resetAll(): void {
    for (const telemetry of this.instances.values()) {
      telemetry.reset();
    }
  }
}
