/**
 * Centralized Timeout Manager for NeuroLink
 *
 * Provides consistent timeout handling across all operations with proper cleanup,
 * abort controller integration, and graceful degradation.
 */

import { parseTimeout, TimeoutError, DEFAULT_TIMEOUTS } from "./timeout.js";

export interface TimeoutConfig {
  operation: string;
  timeout?: number | string;
  gracefulShutdown?: boolean;
  retryOnTimeout?: boolean;
  maxRetries?: number;
  abortSignal?: AbortSignal;
}

export interface TimeoutResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  timedOut: boolean;
  executionTime: number;
  retriesUsed: number;
}

/**
 * Enhanced timeout manager with proper cleanup and abort controller integration
 */
export class TimeoutManager {
  private activeTimeouts: Map<
    string,
    {
      timer: NodeJS.Timeout;
      controller: AbortController;
      cleanup: () => void;
    }
  > = new Map();

  /**
   * Execute operation with timeout and proper cleanup
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig,
  ): Promise<TimeoutResult<T>> {
    const startTime = Date.now();
    const operationId = this.generateOperationId(config.operation);
    let retriesUsed = 0;
    const maxRetries = config.retryOnTimeout ? (config.maxRetries ?? 1) : 0;

    while (retriesUsed <= maxRetries) {
      try {
        const result = await this.performSingleOperation(
          operation,
          config,
          operationId,
        );

        return {
          success: true,
          data: result,
          timedOut: false,
          executionTime: Date.now() - startTime,
          retriesUsed,
        };
      } catch (error) {
        // Clean up any active timeouts for this operation
        this.cleanup(operationId);

        if (error instanceof TimeoutError && retriesUsed < maxRetries) {
          retriesUsed++;
          continue;
        }

        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          timedOut: error instanceof TimeoutError,
          executionTime: Date.now() - startTime,
          retriesUsed,
        };
      }
    }

    // This should never be reached, but TypeScript needs it
    return {
      success: false,
      error: new Error("Maximum retries exceeded"),
      timedOut: true,
      executionTime: Date.now() - startTime,
      retriesUsed,
    };
  }

  /**
   * Execute single operation with timeout
   */
  private async performSingleOperation<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig,
    operationId: string,
  ): Promise<T> {
    const timeoutMs = this.getTimeoutMs(config);

    if (!timeoutMs) {
      // No timeout specified, execute directly
      return await operation();
    }

    // Create abort controller for this operation
    const controller = new AbortController();
    const existingSignal = config.abortSignal;

    // Merge with existing abort signal if provided
    if (existingSignal) {
      existingSignal.addEventListener("abort", () => {
        controller.abort(existingSignal.reason);
      });

      if (existingSignal.aborted) {
        throw new Error("Operation aborted before execution");
      }
    }

    // Set up timeout
    const timer = setTimeout(() => {
      controller.abort(
        new TimeoutError(
          `Operation '${config.operation}' timed out after ${timeoutMs}ms`,
          timeoutMs,
          "timeout-manager",
          "generate",
        ),
      );
    }, timeoutMs);

    // Cleanup function
    const cleanup = () => {
      clearTimeout(timer);
      this.activeTimeouts.delete(operationId);
    };

    // Store active timeout for potential cleanup
    this.activeTimeouts.set(operationId, {
      timer,
      controller,
      cleanup,
    });

    try {
      // Execute operation with abort signal
      const result = await this.executeWithAbortSignal(
        operation,
        controller.signal,
      );
      cleanup();
      return result;
    } catch (error) {
      cleanup();

      // Convert abort errors to timeout errors if appropriate
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(
          `Operation '${config.operation}' was aborted`,
          timeoutMs,
          "timeout-manager",
          "generate",
        );
      }

      throw error;
    }
  }

  /**
   * Execute operation with abort signal support
   */
  private async executeWithAbortSignal<T>(
    operation: () => Promise<T>,
    signal: AbortSignal,
  ): Promise<T> {
    // Check if already aborted
    if (signal.aborted) {
      throw new Error("Operation aborted");
    }

    // Race between operation and abort signal
    return new Promise<T>((resolve, reject) => {
      // Listen for abort
      signal.addEventListener("abort", () => {
        reject(signal.reason || new Error("Operation aborted"));
      });

      // Execute operation
      operation().then(resolve).catch(reject);
    });
  }

  /**
   * Get timeout in milliseconds from config
   */
  private getTimeoutMs(config: TimeoutConfig): number | undefined {
    if (config.timeout !== undefined) {
      return parseTimeout(config.timeout);
    }

    // Use default timeout based on operation type
    const operation = config.operation.toLowerCase();

    // MCP operations
    if (operation.includes("mcp") || operation.includes("server")) {
      return parseTimeout(DEFAULT_TIMEOUTS.tools.network);
    }

    // File operations
    if (
      operation.includes("file") ||
      operation.includes("read") ||
      operation.includes("write")
    ) {
      return parseTimeout(DEFAULT_TIMEOUTS.tools.filesystem);
    }

    // Network operations
    if (
      operation.includes("network") ||
      operation.includes("http") ||
      operation.includes("fetch")
    ) {
      return parseTimeout(DEFAULT_TIMEOUTS.tools.network);
    }

    // Default
    return parseTimeout(DEFAULT_TIMEOUTS.tools.default);
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(operation: string): string {
    return `${operation}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Cleanup specific operation
   */
  cleanup(operationId: string): void {
    const timeout = this.activeTimeouts.get(operationId);
    if (timeout) {
      timeout.cleanup();
    }
  }

  /**
   * Cleanup all active timeouts (call on shutdown)
   */
  cleanupAll(): void {
    for (const [id, timeout] of this.activeTimeouts) {
      timeout.cleanup();
    }
    this.activeTimeouts.clear();
  }

  /**
   * Get current active timeout count (for debugging)
   */
  getActiveTimeoutCount(): number {
    return this.activeTimeouts.size;
  }

  /**
   * Create a timeout wrapper for child process operations
   */
  wrapChildProcess<T>(
    processFactory: () => Promise<T>,
    config: TimeoutConfig,
  ): Promise<TimeoutResult<T>> {
    return this.executeWithTimeout(processFactory, {
      ...config,
      gracefulShutdown: true,
      timeout: config.timeout || DEFAULT_TIMEOUTS.tools.network,
    });
  }

  /**
   * Create a timeout wrapper for MCP server operations
   */
  wrapMCPOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    timeoutMs?: number,
  ): Promise<TimeoutResult<T>> {
    return this.executeWithTimeout(operation, {
      operation: `mcp-${operationName}`,
      timeout: timeoutMs || parseTimeout(DEFAULT_TIMEOUTS.tools.network),
      retryOnTimeout: false,
      gracefulShutdown: true,
    });
  }

  /**
   * Create a timeout wrapper for CLI operations
   */
  wrapCLIOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    timeoutMs?: number,
  ): Promise<TimeoutResult<T>> {
    return this.executeWithTimeout(operation, {
      operation: `cli-${operationName}`,
      timeout: timeoutMs || 120000, // 2 minutes default for CLI
      retryOnTimeout: false,
      gracefulShutdown: true,
    });
  }
}

// Factory function to create a new TimeoutManager instance
export function createTimeoutManager(): TimeoutManager {
  return new TimeoutManager();
}

// Lazy-loaded default timeout manager instance
let _defaultTimeoutManager: TimeoutManager | null = null;
export function getDefaultTimeoutManager(): TimeoutManager {
  if (!_defaultTimeoutManager) {
    _defaultTimeoutManager = createTimeoutManager();
  }
  return _defaultTimeoutManager;
}

// Export default instance for backwards compatibility
export const defaultTimeoutManager = getDefaultTimeoutManager();

// Cleanup on process exit
if (typeof process !== "undefined") {
  process.once("exit", () => {
    getDefaultTimeoutManager().cleanupAll();
  });

  process.once("SIGINT", () => {
    getDefaultTimeoutManager().cleanupAll();
    process.exit(0);
  });

  process.once("SIGTERM", () => {
    getDefaultTimeoutManager().cleanupAll();
    process.exit(0);
  });
}
