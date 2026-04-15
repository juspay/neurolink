/**
 * Exporter Registry
 * Manages multiple observability exporters with circuit breaker protection
 */

import { logger } from "../utils/logger.js";
import type { BaseExporter } from "./exporters/baseExporter.js";
import { AlwaysSampler } from "./sampling/samplers.js";
import type {
  ExporterHealthStatus,
  ExportResult,
  Sampler,
  SpanData,
} from "../types/index.js";

/** Default timeout for exporter API calls (30 seconds) */
const DEFAULT_EXPORT_TIMEOUT_MS = 30_000;

/**
 * Wrap a promise with a timeout. Rejects with a descriptive error if the
 * promise does not settle within `timeoutMs` milliseconds.
 */
function withExportTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Export to '${label}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Circuit breaker state for an exporter
 */
type CircuitBreakerState = {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
};

/**
 * Circuit breaker configuration
 */
type CircuitBreakerConfig = {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before trying half-open state */
  resetTimeout: number;
};

/**
 * Registry for managing multiple observability exporters
 * Includes circuit breaker protection to prevent cascading failures
 */
export class ExporterRegistry {
  private exporters: Map<string, BaseExporter> = new Map();
  private defaultExporter: string | null = null;
  private sampler: Sampler = new AlwaysSampler();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly circuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
  };

  /**
   * Register an exporter
   */
  register(exporter: BaseExporter): void {
    this.exporters.set(exporter.getName(), exporter);
  }

  /**
   * Unregister an exporter
   */
  unregister(name: string): boolean {
    return this.exporters.delete(name);
  }

  /**
   * Get an exporter by name
   */
  get(name: string): BaseExporter | undefined {
    return this.exporters.get(name);
  }

  /**
   * Get all registered exporter names
   */
  getNames(): string[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * Get total exporter count
   */
  getCount(): number {
    return this.exporters.size;
  }

  /**
   * Set the default exporter
   */
  setDefault(name: string): void {
    if (!this.exporters.has(name)) {
      throw new Error(`Exporter '${name}' not registered`);
    }
    this.defaultExporter = name;
  }

  /**
   * Get the default exporter
   */
  getDefault(): BaseExporter | undefined {
    if (!this.defaultExporter) {
      return undefined;
    }
    return this.exporters.get(this.defaultExporter);
  }

  /**
   * Set the sampler for the registry
   */
  setSampler(sampler: Sampler): void {
    this.sampler = sampler;
  }

  /**
   * Get the current sampler
   */
  getSampler(): Sampler {
    return this.sampler;
  }

  /**
   * Configure the circuit breaker settings
   * @param config - Partial circuit breaker configuration
   */
  configureCircuitBreaker(config: Partial<CircuitBreakerConfig>): void {
    Object.assign(this.circuitBreakerConfig, config);
  }

  /**
   * Check if circuit is open for an exporter
   * @param exporterName - Name of the exporter
   * @returns true if circuit is open (exporter should be skipped)
   */
  private isCircuitOpen(exporterName: string): boolean {
    const breaker = this.circuitBreakers.get(exporterName);
    if (!breaker) {
      return false;
    }

    if (breaker.state === "open") {
      // Check if we should try half-open
      if (
        Date.now() - breaker.lastFailure >
        this.circuitBreakerConfig.resetTimeout
      ) {
        breaker.state = "half-open";
        logger.info(
          `[ExporterRegistry] Circuit half-open for ${exporterName}, attempting recovery`,
        );
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record a failure for an exporter's circuit breaker
   * @param exporterName - Name of the exporter
   */
  private recordFailure(exporterName: string): void {
    let breaker = this.circuitBreakers.get(exporterName);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, state: "closed" };
      this.circuitBreakers.set(exporterName, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.circuitBreakerConfig.failureThreshold) {
      breaker.state = "open";
      logger.warn(
        `[ExporterRegistry] Circuit opened for ${exporterName} after ${breaker.failures} failures`,
      );
    }
  }

  /**
   * Record a success for an exporter's circuit breaker
   * Resets the circuit to closed state
   * @param exporterName - Name of the exporter
   */
  private recordSuccess(exporterName: string): void {
    const breaker = this.circuitBreakers.get(exporterName);
    if (breaker) {
      if (breaker.state === "half-open") {
        logger.info(
          `[ExporterRegistry] Circuit closed for ${exporterName} after successful recovery`,
        );
      }
      breaker.failures = 0;
      breaker.state = "closed";
    }
  }

  /**
   * Get circuit breaker status for an exporter
   * @param exporterName - Name of the exporter
   * @returns Circuit breaker state or undefined if not tracked
   */
  getCircuitBreakerStatus(
    exporterName: string,
  ): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(exporterName);
  }

  /**
   * Reset circuit breaker for an exporter
   * @param exporterName - Name of the exporter
   */
  resetCircuitBreaker(exporterName: string): void {
    this.circuitBreakers.delete(exporterName);
  }

  /**
   * Export span to all registered exporters
   * Applies sampling and circuit breaker protection before export
   */
  async exportToAll(span: SpanData): Promise<Map<string, ExportResult>> {
    const results = new Map<string, ExportResult>();

    // Apply sampling
    if (!this.sampler.shouldSample(span)) {
      // Return empty results if not sampled
      return results;
    }

    const exportPromises = Array.from(this.exporters.entries()).map(
      async ([name, exporter]) => {
        // Check circuit breaker before attempting export
        if (this.isCircuitOpen(name)) {
          results.set(name, {
            success: false,
            exportedCount: 0,
            failedCount: 1,
            errors: [
              {
                spanId: span.spanId,
                error: "Circuit breaker open - exporter temporarily disabled",
                retryable: true,
              },
            ],
            durationMs: 0,
          });
          return;
        }

        if (exporter.isInitialized()) {
          try {
            const result = await withExportTimeout(
              exporter.exportSpan(span),
              DEFAULT_EXPORT_TIMEOUT_MS,
              name,
            );
            results.set(name, result);

            // Record success or failure based on result
            if (result.success) {
              this.recordSuccess(name);
            } else {
              this.recordFailure(name);
            }
          } catch (error) {
            this.recordFailure(name);
            results.set(name, {
              success: false,
              exportedCount: 0,
              failedCount: 1,
              errors: [
                {
                  spanId: span.spanId,
                  error: error instanceof Error ? error.message : String(error),
                  retryable: true,
                },
              ],
              durationMs: 0,
            });
          }
        } else {
          logger.debug(
            `[ExporterRegistry] Skipping uninitialized exporter '${name}' for span ${span.spanId}`,
          );
        }
      },
    );

    await Promise.all(exportPromises);
    return results;
  }

  /**
   * Export span to a specific exporter
   * Applies sampling and circuit breaker protection
   */
  async exportTo(name: string, span: SpanData): Promise<ExportResult | null> {
    const exporter = this.exporters.get(name);
    if (!exporter) {
      return null;
    }
    if (!exporter.isInitialized()) {
      logger.debug(
        `[ExporterRegistry] Skipping uninitialized exporter '${name}' for span ${span.spanId}`,
      );
      return null;
    }

    // Check circuit breaker before attempting export
    if (this.isCircuitOpen(name)) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: "Circuit breaker open - exporter temporarily disabled",
            retryable: true,
          },
        ],
        durationMs: 0,
      };
    }

    // Apply sampling
    if (!this.sampler.shouldSample(span)) {
      return {
        success: true,
        exportedCount: 0,
        failedCount: 0,
        durationMs: 0,
      };
    }

    try {
      const result = await withExportTimeout(
        exporter.exportSpan(span),
        DEFAULT_EXPORT_TIMEOUT_MS,
        name,
      );
      if (result.success) {
        this.recordSuccess(name);
      } else {
        this.recordFailure(name);
      }
      return result;
    } catch (error) {
      this.recordFailure(name);
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        ],
        durationMs: 0,
      };
    }
  }

  /**
   * Initialize all exporters
   */
  async initializeAll(): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.exporters.entries()).map(([name, e]) =>
        e.initialize().catch((err) => {
          logger.error(
            `[ExporterRegistry] Failed to initialize exporter '${name}':`,
            err,
          );
          throw err;
        }),
      ),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn(
          `[ExporterRegistry] One or more exporters failed to initialize`,
        );
        break;
      }
    }
  }

  /**
   * Shutdown all exporters
   */
  async shutdownAll(): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.exporters.entries()).map(([name, e]) =>
        e.shutdown().catch((err) => {
          logger.error(
            `[ExporterRegistry] Failed to shutdown exporter '${name}':`,
            err,
          );
          throw err;
        }),
      ),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn(
          `[ExporterRegistry] One or more exporters failed to shutdown`,
        );
        break;
      }
    }
  }

  /**
   * Flush all exporters
   */
  async flushAll(): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.exporters.entries()).map(([name, e]) =>
        e.flush().catch((err) => {
          logger.error(
            `[ExporterRegistry] Failed to flush exporter '${name}':`,
            err,
          );
          throw err;
        }),
      ),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn(`[ExporterRegistry] One or more exporters failed to flush`);
        break;
      }
    }
  }

  /**
   * Get health status of all exporters
   */
  async healthCheckAll(): Promise<Map<string, ExporterHealthStatus>> {
    const results = new Map<string, ExporterHealthStatus>();

    const healthPromises = Array.from(this.exporters.entries()).map(
      async ([name, exporter]) => {
        const status = await exporter.healthCheck();
        results.set(name, status);
      },
    );

    await Promise.all(healthPromises);
    return results;
  }

  /**
   * Check if all exporters are healthy
   */
  async isHealthy(): Promise<boolean> {
    const statuses = await this.healthCheckAll();
    return Array.from(statuses.values()).every((s) => s.healthy);
  }

  /**
   * Get total pending spans across all exporters
   */
  getTotalPendingSpans(): number {
    let total = 0;
    const exporterArray = Array.from(this.exporters.values());
    for (const exporter of exporterArray) {
      total += exporter.getPendingCount();
    }
    return total;
  }

  /**
   * Clear all registered exporters and reset state
   * (For testing and cleanup)
   */
  clear(): void {
    this.exporters.clear();
    this.defaultExporter = null;
    this.circuitBreakers.clear();
    this.sampler = new AlwaysSampler();
  }
}

/**
 * Global exporter registry instance (singleton pattern from main)
 */
let globalRegistry: ExporterRegistry | null = null;

/**
 * Get the global exporter registry instance
 */
export function getExporterRegistry(): ExporterRegistry {
  if (!globalRegistry) {
    globalRegistry = new ExporterRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global exporter registry (for testing)
 */
export function resetExporterRegistry(): void {
  if (globalRegistry) {
    globalRegistry.clear();
  }
  globalRegistry = null;
}
