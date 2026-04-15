/**
 * Abstract base class for all observability exporters
 * Follows NeuroLink's factory pattern with a unified exporter interface
 */

import { logger } from "../../utils/logger.js";
import type {
  ExporterConfig,
  ExporterHealthStatus,
  ExportResult,
  SpanData,
} from "../../types/index.js";

/**
 * Abstract base class for all observability exporters
 * Provides common functionality: buffering, flush intervals, health checks, retry logic
 */
export abstract class BaseExporter {
  protected readonly name: string;
  protected readonly config: ExporterConfig;
  protected initialized: boolean = false;
  protected buffer: SpanData[] = [];
  protected readonly maxBufferSize: number;
  protected readonly retries: number;
  protected flushInterval: ReturnType<typeof setInterval> | null = null;
  protected lastExportTime: number = 0;

  constructor(name: string, config: ExporterConfig) {
    this.name = name;
    this.config = config;
    this.maxBufferSize = config.maxBufferSize ?? 100;
    this.retries = config.retries ?? 3;
  }

  /**
   * Initialize the exporter connection
   * Must be called before exporting spans
   */
  abstract initialize(): Promise<void>;

  /**
   * Export a single span
   * @param span - The span data to export
   */
  abstract exportSpan(span: SpanData): Promise<ExportResult>;

  /**
   * Export multiple spans in batch
   * @param spans - Array of span data to export
   */
  abstract exportBatch(spans: SpanData[]): Promise<ExportResult>;

  /**
   * Flush all buffered spans
   */
  abstract flush(): Promise<void>;

  /**
   * Shutdown the exporter gracefully
   * Should flush remaining spans before closing
   */
  abstract shutdown(): Promise<void>;

  /**
   * Check exporter health status
   * Implementations should make an actual API call to verify connectivity
   */
  abstract healthCheck(): Promise<ExporterHealthStatus>;

  /**
   * Ping the exporter's backend to verify connectivity
   * Override this in subclasses to provide backend-specific health check
   */
  protected async ping(): Promise<void> {
    // Default implementation does nothing
    // Subclasses should override this to make an actual API call
  }

  /**
   * Buffer a span for batch export
   * Triggers flush if buffer is full
   */
  protected bufferSpan(span: SpanData): void {
    this.buffer.push(span);
    if (this.buffer.length >= this.maxBufferSize) {
      // Use void to explicitly ignore the promise
      void this.flush();
    }
  }

  /**
   * Start automatic flush interval
   * @param intervalMs - Interval in milliseconds between flushes
   */
  protected startFlushInterval(intervalMs: number): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushInterval = setInterval(() => {
      this.flush().catch((error: unknown) => {
        logger.warn(`[${this.name}] Periodic flush failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, intervalMs);
  }

  /**
   * Stop the automatic flush interval
   */
  protected stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Get exporter name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if exporter is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get number of pending spans in buffer
   */
  getPendingCount(): number {
    return this.buffer.length;
  }

  /**
   * Get last export timestamp
   */
  getLastExportTime(): number {
    return this.lastExportTime;
  }

  /**
   * Create a standard export result for success
   */
  protected createSuccessResult(
    exportedCount: number,
    durationMs: number,
  ): ExportResult {
    this.lastExportTime = Date.now();
    return {
      success: true,
      exportedCount,
      failedCount: 0,
      durationMs,
    };
  }

  /**
   * Create a standard export result for failure
   */
  protected createFailureResult(
    spanIds: string[],
    error: string,
    durationMs: number,
    retryable: boolean = true,
  ): ExportResult {
    return {
      success: false,
      exportedCount: 0,
      failedCount: spanIds.length,
      errors: spanIds.map((spanId) => ({
        spanId,
        error,
        retryable,
      })),
      durationMs,
    };
  }

  /**
   * Create a standard health status
   */
  protected createHealthStatus(
    healthy: boolean,
    errors?: string[],
  ): ExporterHealthStatus {
    return {
      healthy,
      name: this.name,
      pendingSpans: this.buffer.length,
      lastExportTime: this.lastExportTime || undefined,
      errors,
    };
  }

  /**
   * Execute an operation with exponential backoff retry
   * @param operation - The async operation to execute
   * @param operationName - Name for logging purposes
   * @returns The result of the operation
   * @throws The last error if all retries fail
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const maxRetries = this.retries;
    const baseDelay = 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = baseDelay * 2 ** attempt;
          logger.warn(
            `[${this.name}] ${operationName} failed, retrying in ${delay}ms`,
            {
              attempt: attempt + 1,
              maxRetries,
              error: lastError.message,
            },
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

/**
 * No-op exporter for when observability is disabled
 * Provides zero-overhead behavior
 */
export class NoOpExporter extends BaseExporter {
  constructor() {
    super("noop", { enabled: false });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async exportSpan(_span: SpanData): Promise<ExportResult> {
    return this.createSuccessResult(0, 0);
  }

  async exportBatch(_spans: SpanData[]): Promise<ExportResult> {
    return this.createSuccessResult(0, 0);
  }

  async flush(): Promise<void> {
    // No-op
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    return this.createHealthStatus(true);
  }
}
