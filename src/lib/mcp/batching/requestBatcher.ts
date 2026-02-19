/**
 * Request Batcher - Batches multiple tool calls for efficiency
 *
 * Provides intelligent batching of MCP tool calls to reduce overhead
 * and improve throughput. Supports automatic flushing based on:
 * - Maximum batch size
 * - Maximum wait time
 * - Manual flush triggers
 */

import { EventEmitter } from "events";
import { logger } from "../../utils/logger.js";
import { ErrorFactory } from "../../utils/errorHandling.js";

/**
 * Batch configuration options
 */
export type BatchConfig = {
  /**
   * Maximum number of requests to batch together (default: 10)
   */
  maxBatchSize: number;

  /**
   * Maximum time to wait for a full batch in milliseconds (default: 100ms)
   */
  maxWaitMs: number;

  /**
   * Enable parallel execution of batched requests (default: true).
   * Reserved for future parallel batch execution; currently stored but not read.
   */
  enableParallel?: boolean;

  /**
   * Maximum concurrent batches in flight (default: 5)
   */
  maxConcurrentBatches?: number;

  /**
   * Group requests by server ID (default: true)
   */
  groupByServer?: boolean;
};

/**
 * Pending request in the batch queue
 */
type PendingRequest<T> = {
  id: string;
  tool: string;
  args: unknown;
  serverId?: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  addedAt: number;
};

/**
 * Batch execution result
 */
export type BatchResult<T> = {
  id: string;
  success: boolean;
  result?: T;
  error?: Error;
  executionTime: number;
};

/**
 * Batch executor function type
 */
export type BatchExecutor<T> = (
  requests: Array<{ tool: string; args: unknown; serverId?: string }>,
) => Promise<Array<{ success: boolean; result?: T; error?: Error }>>;

/**
 * Batcher events
 */
export type BatcherEvents<T> = {
  batchStarted: { batchId: string; size: number };
  batchCompleted: { batchId: string; results: BatchResult<T>[] };
  batchFailed: { batchId: string; error: Error };
  requestQueued: { requestId: string; queueSize: number };
  flushTriggered: { reason: "size" | "timeout" | "manual"; queueSize: number };
};

/**
 * Request Batcher - Efficient batch processing for MCP tool calls
 *
 * @example
 * ```typescript
 * const batcher = new RequestBatcher<ToolResult>({
 *   maxBatchSize: 10,
 *   maxWaitMs: 100,
 * });
 *
 * // Set the batch executor
 * batcher.setExecutor(async (requests) => {
 *   // Execute all requests in a batch
 *   return await Promise.all(requests.map(r => executeTool(r.tool, r.args)));
 * });
 *
 * // Add requests - they'll be batched automatically
 * const result1 = await batcher.add('getUserById', { id: 1 });
 * const result2 = await batcher.add('getUserById', { id: 2 });
 * ```
 */
export class RequestBatcher<T = unknown> extends EventEmitter {
  private config: Required<BatchConfig>;
  private pending: Map<string, PendingRequest<T>> = new Map();
  private serverQueues: Map<string, Set<string>> = new Map();
  private flushTimer?: ReturnType<typeof setTimeout>;
  private executor?: BatchExecutor<T>;
  private activeBatches = 0;
  private batchCounter = 0;
  private requestCounter = 0;
  private isDestroyed = false;

  constructor(config: BatchConfig) {
    super();

    this.config = {
      maxBatchSize: config.maxBatchSize,
      maxWaitMs: config.maxWaitMs,
      enableParallel: config.enableParallel ?? true,
      maxConcurrentBatches: config.maxConcurrentBatches ?? 5,
      groupByServer: config.groupByServer ?? true,
    };
  }

  /**
   * Set the batch executor function
   */
  setExecutor(executor: BatchExecutor<T>): void {
    this.executor = executor;
  }

  /**
   * Add a request to the batch queue
   */
  async add(tool: string, args: unknown, serverId?: string): Promise<T> {
    if (this.isDestroyed) {
      throw ErrorFactory.invalidConfiguration(
        "batcher",
        "Batcher has been destroyed",
      );
    }

    if (!this.executor) {
      throw ErrorFactory.missingConfiguration("batchExecutor", {
        hint: "Call setExecutor() before adding requests",
      });
    }

    const requestId = this.generateRequestId();

    return new Promise<T>((resolve, reject) => {
      const request: PendingRequest<T> = {
        id: requestId,
        tool,
        args,
        serverId,
        resolve,
        reject,
        addedAt: Date.now(),
      };

      this.pending.set(requestId, request);

      // Track by server if grouping is enabled
      if (this.config.groupByServer && serverId) {
        if (!this.serverQueues.has(serverId)) {
          this.serverQueues.set(serverId, new Set());
        }
        const queue = this.serverQueues.get(serverId);
        if (queue) {
          queue.add(requestId);
        }
      }

      this.emit("requestQueued", {
        requestId,
        queueSize: this.pending.size,
      });

      // Check if we should flush immediately
      if (this.pending.size >= this.config.maxBatchSize) {
        this.scheduleFlush("size");
      } else if (!this.flushTimer) {
        // Start the timer for delayed flush
        this.flushTimer = setTimeout(() => {
          this.scheduleFlush("timeout");
        }, this.config.maxWaitMs);
      }
    });
  }

  /**
   * Manually flush the current batch
   */
  async flush(): Promise<void> {
    this.clearFlushTimer();

    if (this.pending.size === 0) {
      return;
    }

    this.emit("flushTriggered", {
      reason: "manual",
      queueSize: this.pending.size,
    });

    await this.executeBatch();
  }

  /**
   * Get current queue size
   */
  get queueSize(): number {
    return this.pending.size;
  }

  /**
   * Get number of active batches
   */
  get activeBatchCount(): number {
    return this.activeBatches;
  }

  /**
   * Check if the batcher is idle (no pending requests)
   */
  get isIdle(): boolean {
    return this.pending.size === 0 && this.activeBatches === 0;
  }

  /**
   * Wait for all pending requests to complete
   */
  async drain(): Promise<void> {
    await this.flush();

    const maxDrainTimeout = 30_000;
    const deadline = Date.now() + maxDrainTimeout;

    // Wait for all queued and active batches to complete
    while (!this.isIdle) {
      if (Date.now() >= deadline) {
        throw ErrorFactory.toolTimeout("batchDrain", maxDrainTimeout);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Destroy the batcher and reject all pending requests
   */
  destroy(): void {
    this.isDestroyed = true;
    this.clearFlushTimer();

    // Reject all pending requests
    for (const request of this.pending.values()) {
      request.reject(
        ErrorFactory.invalidConfiguration(
          "batcher",
          "Batcher was destroyed before request could complete",
        ),
      );
    }

    this.pending.clear();
    this.serverQueues.clear();
  }

  // ==================== Private Methods ====================

  private generateRequestId(): string {
    return `req-${Date.now()}-${++this.requestCounter}`;
  }

  private generateBatchId(): string {
    return `batch-${Date.now()}-${++this.batchCounter}`;
  }

  private scheduleFlush(reason: "size" | "timeout"): void {
    this.clearFlushTimer();

    this.emit("flushTriggered", {
      reason,
      queueSize: this.pending.size,
    });

    // Execute immediately but don't block
    setImmediate(() => {
      this.executeBatch().catch((error) => {
        logger.error("Batch execution failed:", error);
      });
    });
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private async executeBatch(): Promise<void> {
    if (this.pending.size === 0) {
      return;
    }

    // Check concurrent batch limit
    if (this.activeBatches >= this.config.maxConcurrentBatches) {
      // Reschedule for later
      this.clearFlushTimer();
      this.flushTimer = setTimeout(() => {
        this.executeBatch().catch((error) => {
          logger.error("Rescheduled batch execution failed:", error);
        });
      }, 10);
      return;
    }

    // Get requests for this batch
    const batchRequests = this.selectBatchRequests();

    if (batchRequests.length === 0) {
      return;
    }

    const batchId = this.generateBatchId();
    const startTime = Date.now();
    this.activeBatches++;

    this.emit("batchStarted", { batchId, size: batchRequests.length });

    try {
      // Guard against missing executor
      if (!this.executor) {
        throw ErrorFactory.missingConfiguration("batchExecutor", {
          hint: "Call setExecutor() before executing batches",
        });
      }

      // Execute the batch with a timeout to prevent indefinite hangs
      const executorPromise = this.executor(
        batchRequests.map((r) => ({
          tool: r.tool,
          args: r.args,
          serverId: r.serverId,
        })),
      );
      const timeoutMs = 30_000;
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(ErrorFactory.toolTimeout("batchExecution", timeoutMs)),
          timeoutMs,
        );
      });
      const results = await Promise.race([
        executorPromise,
        timeoutPromise,
      ]).finally(() => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      });

      // Process results
      const batchResults: BatchResult<T>[] = [];

      for (let i = 0; i < batchRequests.length; i++) {
        const request = batchRequests[i];
        const result = results[i];
        const executionTime = Date.now() - startTime;

        if (!result) {
          const noResultError = ErrorFactory.toolExecutionFailed(
            request.tool,
            new Error(`Batch executor returned no result for request ${i}`),
          );
          request.reject(noResultError);
          batchResults.push({
            id: request.id,
            success: false,
            error: noResultError,
            executionTime,
          });
          continue;
        }

        if (result.success) {
          request.resolve(result.result as T);
          batchResults.push({
            id: request.id,
            success: true,
            result: result.result,
            executionTime,
          });
        } else {
          const error =
            result.error ??
            ErrorFactory.toolExecutionFailed(
              request.tool,
              new Error("Unknown batch execution error"),
            );
          request.reject(error);
          batchResults.push({
            id: request.id,
            success: false,
            error,
            executionTime,
          });
        }
      }

      this.emit("batchCompleted", { batchId, results: batchResults });
    } catch (error) {
      // Batch-level failure - reject all requests
      const batchError =
        error instanceof Error
          ? error
          : ErrorFactory.toolExecutionFailed("batch", new Error(String(error)));

      for (const request of batchRequests) {
        request.reject(batchError);
      }

      this.emit("batchFailed", { batchId, error: batchError });
    } finally {
      this.activeBatches--;
    }

    // Schedule next batch if there are more pending requests
    if (this.pending.size > 0) {
      this.clearFlushTimer();
      this.flushTimer = setTimeout(() => {
        this.executeBatch().catch((error) => {
          logger.error("Follow-up batch execution failed:", error);
        });
      }, 0);
    }
  }

  private selectBatchRequests(): PendingRequest<T>[] {
    const batchRequests: PendingRequest<T>[] = [];

    if (this.config.groupByServer && this.serverQueues.size > 0) {
      // Select from a single server queue for better locality
      const [serverId, requestIds] = this.serverQueues.entries().next()
        .value as [string, Set<string>];

      for (const requestId of requestIds) {
        if (batchRequests.length >= this.config.maxBatchSize) {
          break;
        }

        const request = this.pending.get(requestId);
        if (request) {
          batchRequests.push(request);
          this.pending.delete(requestId);
          requestIds.delete(requestId);
        }
      }

      // Clean up empty server queue
      if (requestIds.size === 0) {
        this.serverQueues.delete(serverId);
      }
    } else {
      // Select oldest requests up to batch size
      const sortedRequests = Array.from(this.pending.values()).sort(
        (a, b) => a.addedAt - b.addedAt,
      );

      for (const request of sortedRequests) {
        if (batchRequests.length >= this.config.maxBatchSize) {
          break;
        }

        batchRequests.push(request);
        this.pending.delete(request.id);
      }
    }

    return batchRequests;
  }
}

/**
 * Factory function to create a RequestBatcher instance
 */
export const createRequestBatcher = <T = unknown>(
  config: BatchConfig,
): RequestBatcher<T> => new RequestBatcher<T>(config);

/**
 * Default batcher configuration
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 10,
  maxWaitMs: 100,
  enableParallel: true,
  maxConcurrentBatches: 5,
  groupByServer: true,
};

/**
 * Tool Call Batcher - Specialized batcher for MCP tool calls
 */
export class ToolCallBatcher {
  private batcher: RequestBatcher<unknown>;
  private toolExecutor?: (
    tool: string,
    args: unknown,
    serverId?: string,
  ) => Promise<unknown>;

  constructor(config?: Partial<BatchConfig>) {
    this.batcher = new RequestBatcher<unknown>({
      ...DEFAULT_BATCH_CONFIG,
      ...config,
    });

    // Set up internal executor that calls individual tool executions
    this.batcher.setExecutor(async (requests) => {
      if (!this.toolExecutor) {
        throw ErrorFactory.missingConfiguration("toolExecutor", {
          hint: "Call setToolExecutor() before executing tool calls",
        });
      }

      const executor = this.toolExecutor;
      const results = await Promise.all(
        requests.map(async (req) => {
          try {
            const result = await executor(req.tool, req.args, req.serverId);
            return { success: true, result };
          } catch (error) {
            return {
              success: false,
              error:
                error instanceof Error
                  ? error
                  : ErrorFactory.toolExecutionFailed(
                      req.tool,
                      new Error(String(error)),
                    ),
            };
          }
        }),
      );

      return results;
    });
  }

  /**
   * Set the tool executor function
   */
  setToolExecutor(
    executor: (
      tool: string,
      args: unknown,
      serverId?: string,
    ) => Promise<unknown>,
  ): void {
    this.toolExecutor = executor;
  }

  /**
   * Execute a tool call (will be batched automatically)
   */
  async execute(
    tool: string,
    args: unknown,
    serverId?: string,
  ): Promise<unknown> {
    return this.batcher.add(tool, args, serverId);
  }

  /**
   * Flush pending tool calls
   */
  async flush(): Promise<void> {
    return this.batcher.flush();
  }

  /**
   * Wait for all pending tool calls to complete
   */
  async drain(): Promise<void> {
    return this.batcher.drain();
  }

  /**
   * Get current queue size
   */
  get queueSize(): number {
    return this.batcher.queueSize;
  }

  /**
   * Check if idle
   */
  get isIdle(): boolean {
    return this.batcher.isIdle;
  }

  /**
   * Destroy the batcher
   */
  destroy(): void {
    this.batcher.destroy();
  }
}

/**
 * Create a tool call batcher instance
 */
export const createToolCallBatcher = (
  config?: Partial<BatchConfig>,
): ToolCallBatcher => new ToolCallBatcher(config);
