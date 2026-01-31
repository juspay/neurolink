/**
 * Health Check Utilities
 *
 * Provides health monitoring and status reporting for storage providers.
 * Supports periodic health checks, status aggregation, and alerting.
 */

import { withTimeout } from "../utils/async/withTimeout.js";
import { logger } from "../utils/logger.js";
import type {
  StorageProvider,
  StorageHealthResult,
  HealthCheckConfig,
  HealthCheckStatus,
  DetailedHealthResult,
  HealthCheckEntry,
  HealthCheckCallback,
  AggregatedHealthStatus,
} from "../types/index.js";

/**
 * Storage health monitor
 *
 * Monitors the health of a storage provider with periodic checks.
 */
export class StorageHealthMonitor {
  /** Storage provider to monitor */
  private storage: StorageProvider;

  /** Configuration */
  private config: Required<HealthCheckConfig>;

  /** Health check interval timer */
  private intervalTimer?: NodeJS.Timeout;

  /** Check history */
  private history: HealthCheckEntry[] = [];

  /** Maximum history length */
  private maxHistoryLength = 100;

  /** Current consecutive failures */
  private consecutiveFailures = 0;

  /** Current consecutive successes */
  private consecutiveSuccesses = 0;

  /** Last health result */
  private lastResult?: DetailedHealthResult;

  /** Callbacks */
  private callbacks: HealthCheckCallback[] = [];

  /** Whether monitor is running */
  private running = false;

  constructor(storage: StorageProvider, config?: HealthCheckConfig) {
    this.storage = storage;
    this.config = {
      intervalMs: config?.intervalMs ?? 30000,
      timeoutMs: config?.timeoutMs ?? 5000,
      failureThreshold: config?.failureThreshold ?? 3,
      successThreshold: config?.successThreshold ?? 2,
      enabled: config?.enabled ?? true,
    };
  }

  /**
   * Start the health monitor
   */
  start(): void {
    if (this.running || !this.config.enabled) {
      return;
    }

    this.running = true;

    // Perform initial check
    this.performCheck();

    // Set up interval
    this.intervalTimer = setInterval(() => {
      this.performCheck();
    }, this.config.intervalMs);

    logger.debug("[HealthMonitor] Started", {
      backend: this.storage.type,
      intervalMs: this.config.intervalMs,
    });
  }

  /**
   * Stop the health monitor
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }

    logger.debug("[HealthMonitor] Stopped", { backend: this.storage.type });
  }

  /**
   * Register a callback for health status changes
   */
  onStatusChange(callback: HealthCheckCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a callback
   */
  offStatusChange(callback: HealthCheckCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index >= 0) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Get current health status
   */
  async getStatus(): Promise<DetailedHealthResult> {
    if (!this.lastResult) {
      // Perform a check if no cached result
      await this.performCheck();
    }
    return this.lastResult!;
  }

  /**
   * Get current status synchronously (may be stale)
   */
  getCachedStatus(): DetailedHealthResult | undefined {
    return this.lastResult;
  }

  /**
   * Force a health check
   */
  async forceCheck(): Promise<DetailedHealthResult> {
    await this.performCheck();
    return this.lastResult!;
  }

  /**
   * Perform a health check
   */
  private async performCheck(): Promise<void> {
    const startTime = performance.now();
    const timestamp = new Date();
    let entry: HealthCheckEntry;

    try {
      // Run health check with timeout
      const result = await withTimeout(
        this.storage.healthCheck(),
        this.config.timeoutMs,
        `Health check timeout (${this.config.timeoutMs}ms)`,
      );

      const latencyMs = Math.round(performance.now() - startTime);

      entry = {
        timestamp,
        healthy: result.healthy,
        latencyMs,
        error: result.error,
      };

      if (result.healthy) {
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
      }
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      entry = {
        timestamp,
        healthy: false,
        latencyMs,
        error: errorMessage,
      };

      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
    }

    // Update history
    this.history.push(entry);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }

    // Determine status
    const status = this.determineStatus();

    // Calculate average latency
    const recentEntries = this.history.slice(-10);
    const latencies = recentEntries
      .filter((e) => e.latencyMs !== undefined)
      .map((e) => e.latencyMs!);
    const averageLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : undefined;

    // Build result
    this.lastResult = {
      healthy: entry.healthy,
      backend: this.storage.type,
      latencyMs: entry.latencyMs,
      error: entry.error,
      status,
      lastCheck: timestamp,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      averageLatencyMs,
      history: [...this.history],
    };

    // Notify callbacks
    for (const callback of this.callbacks) {
      try {
        callback(this.lastResult);
      } catch (error) {
        logger.warn("[HealthMonitor] Callback error", { error });
      }
    }
  }

  /**
   * Determine overall health status
   */
  private determineStatus(): HealthCheckStatus {
    // Never checked
    if (this.history.length === 0) {
      return "unknown";
    }

    // Check thresholds
    if (this.consecutiveSuccesses >= this.config.successThreshold) {
      return "healthy";
    }

    if (this.consecutiveFailures >= this.config.failureThreshold) {
      return "unhealthy";
    }

    // Mixed results - degraded
    const recentEntries = this.history.slice(-5);
    const healthyCount = recentEntries.filter((e) => e.healthy).length;

    if (healthyCount >= 3) {
      return "healthy";
    } else if (healthyCount >= 1) {
      return "degraded";
    } else {
      return "unhealthy";
    }
  }
}

/**
 * Multi-storage health aggregator
 *
 * Aggregates health status from multiple storage providers.
 */
export class StorageHealthAggregator {
  /** Individual monitors */
  private monitors = new Map<string, StorageHealthMonitor>();

  /** Callbacks for aggregated status */
  private callbacks: Array<(status: AggregatedHealthStatus) => void> = [];

  /**
   * Add a storage provider to monitor
   */
  addStorage(
    name: string,
    storage: StorageProvider,
    config?: HealthCheckConfig,
  ): void {
    if (this.monitors.has(name)) {
      throw new Error(`Storage "${name}" is already being monitored`);
    }

    const monitor = new StorageHealthMonitor(storage, config);
    monitor.onStatusChange(() => this.notifyCallbacks());
    this.monitors.set(name, monitor);
  }

  /**
   * Remove a storage provider from monitoring
   */
  removeStorage(name: string): void {
    const monitor = this.monitors.get(name);
    if (monitor) {
      monitor.stop();
      this.monitors.delete(name);
    }
  }

  /**
   * Start monitoring all storage providers
   */
  startAll(): void {
    for (const monitor of this.monitors.values()) {
      monitor.start();
    }
  }

  /**
   * Stop monitoring all storage providers
   */
  stopAll(): void {
    for (const monitor of this.monitors.values()) {
      monitor.stop();
    }
  }

  /**
   * Register callback for aggregated status changes
   */
  onStatusChange(callback: (status: AggregatedHealthStatus) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Get aggregated health status
   */
  async getStatus(): Promise<AggregatedHealthStatus> {
    const statuses = new Map<string, DetailedHealthResult>();

    for (const [name, monitor] of this.monitors) {
      statuses.set(name, await monitor.getStatus());
    }

    return this.aggregateStatuses(statuses);
  }

  /**
   * Aggregate individual statuses
   */
  private aggregateStatuses(
    statuses: Map<string, DetailedHealthResult>,
  ): AggregatedHealthStatus {
    const entries = Array.from(statuses.entries());

    // Determine overall status
    let overallStatus: HealthCheckStatus = "healthy";
    let totalLatency = 0;
    let latencyCount = 0;

    for (const [, status] of entries) {
      if (status.status === "unhealthy") {
        overallStatus = "unhealthy";
        break;
      } else if (status.status === "degraded" && overallStatus === "healthy") {
        overallStatus = "degraded";
      } else if (status.status === "unknown" && overallStatus === "healthy") {
        overallStatus = "unknown";
      }

      if (status.latencyMs !== undefined) {
        totalLatency += status.latencyMs;
        latencyCount++;
      }
    }

    return {
      overallStatus,
      storages: Object.fromEntries(statuses),
      healthyCount: entries.filter(([, s]) => s.status === "healthy").length,
      unhealthyCount: entries.filter(([, s]) => s.status === "unhealthy")
        .length,
      degradedCount: entries.filter(([, s]) => s.status === "degraded").length,
      averageLatencyMs:
        latencyCount > 0 ? Math.round(totalLatency / latencyCount) : undefined,
      timestamp: new Date(),
    };
  }

  /**
   * Notify callbacks
   */
  private async notifyCallbacks(): Promise<void> {
    const status = await this.getStatus();
    for (const callback of this.callbacks) {
      try {
        callback(status);
      } catch (error) {
        logger.warn("[HealthAggregator] Callback error", { error });
      }
    }
  }
}

/**
 * Create a health monitor for a storage provider
 */
export function createHealthMonitor(
  storage: StorageProvider,
  config?: HealthCheckConfig,
): StorageHealthMonitor {
  return new StorageHealthMonitor(storage, config);
}

/**
 * Simple health check function
 */
export async function checkStorageHealth(
  storage: StorageProvider,
  timeoutMs = 5000,
): Promise<StorageHealthResult> {
  const startTime = performance.now();

  try {
    const result = await Promise.race([
      storage.healthCheck(),
      new Promise<StorageHealthResult>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeoutMs),
      ),
    ]);

    return {
      ...result,
      latencyMs: Math.round(performance.now() - startTime),
    };
  } catch (error) {
    return {
      healthy: false,
      backend: storage.type,
      latencyMs: Math.round(performance.now() - startTime),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
