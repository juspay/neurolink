/**
 * Storage Provider Abstract Base Class
 *
 * Provides common functionality and utilities for all storage backend implementations.
 * Concrete implementations should extend this class and implement all abstract methods.
 */

import { randomUUID } from "crypto";
import type { Span } from "@opentelemetry/api";
import type { JsonValue } from "../types/index.js";
import type {
  StorageProvider,
  StorageBackendType,
  StorageThread,
  StorageMessage,
  StorageWorkflowRun,
  StorageCustomRecord,
  StorageStats,
  StorageHealthResult,
  StorageInitOptions,
  CreateThreadInput,
  UpdateThreadInput,
  CreateMessageInput,
  UpdateMessageInput,
  SaveWorkflowRunInput,
  ThreadQueryOptions,
  MessageQueryOptions,
  WorkflowRunQueryOptions,
  StorageQueryOptions,
  PaginatedResult,
  WorkflowRunStatus,
  StorageWorkflowError,
  StepRunResult,
  SetRecordOptions,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Abstract base class for storage providers
 *
 * Provides common utilities and enforces the storage interface.
 * All storage implementations must extend this class.
 */
export abstract class BaseStorageProvider implements StorageProvider {
  /** Storage backend type - must be set by subclass */
  abstract readonly type: StorageBackendType;

  /** Whether the provider has been initialized */
  protected initialized = false;

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Initialize the storage backend
   */
  abstract init(options?: StorageInitOptions): Promise<void>;

  /**
   * Close storage connections
   */
  abstract close(): Promise<void>;

  /**
   * Check if storage is healthy and connected
   */
  abstract healthCheck(): Promise<StorageHealthResult>;

  // ============================================================================
  // Thread Operations
  // ============================================================================

  abstract createThread(thread: CreateThreadInput): Promise<StorageThread>;

  abstract getThread(threadId: string): Promise<StorageThread | null>;

  abstract updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null>;

  abstract deleteThread(threadId: string): Promise<boolean>;

  abstract listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>>;

  abstract getThreadsByResourceId(
    resourceId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageThread>>;

  // ============================================================================
  // Message Operations
  // ============================================================================

  abstract createMessage(message: CreateMessageInput): Promise<StorageMessage>;

  abstract createMessages(
    messages: CreateMessageInput[],
  ): Promise<StorageMessage[]>;

  abstract getMessage(messageId: string): Promise<StorageMessage | null>;

  abstract updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null>;

  abstract deleteMessage(messageId: string): Promise<boolean>;

  abstract listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>>;

  abstract getMessagesByThreadId(
    threadId: string,
    options?: StorageQueryOptions,
  ): Promise<StorageMessage[]>;

  abstract deleteMessagesByThreadId(threadId: string): Promise<number>;

  // ============================================================================
  // Workflow Run Operations
  // ============================================================================

  abstract saveWorkflowRun(
    run: SaveWorkflowRunInput,
  ): Promise<StorageWorkflowRun>;

  abstract getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null>;

  abstract listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>>;

  abstract updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowError,
  ): Promise<StorageWorkflowRun | null>;

  abstract updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean>;

  abstract getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>>;

  // ============================================================================
  // Custom Record Operations
  // ============================================================================

  abstract setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: SetRecordOptions,
  ): Promise<StorageCustomRecord>;

  abstract getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null>;

  abstract deleteRecord(namespace: string, key: string): Promise<boolean>;

  abstract listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>>;

  abstract hasRecord(namespace: string, key: string): Promise<boolean>;

  abstract deleteNamespace(namespace: string): Promise<number>;

  // ============================================================================
  // Utility Methods
  // ============================================================================

  abstract getStats(): Promise<StorageStats>;

  abstract clearAll(): Promise<void>;

  // ============================================================================
  // Protected Utility Methods
  // ============================================================================

  /**
   * Generate a new UUID
   */
  protected generateId(): string {
    return randomUUID();
  }

  /**
   * Get current timestamp
   */
  protected now(): Date {
    return new Date();
  }

  /**
   * Ensure provider is initialized
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `Storage provider [${this.type}] not initialized. Call init() first.`,
      );
    }
  }

  /**
   * Log operation with context
   */
  protected log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    context?: Record<string, unknown>,
  ): void {
    const prefix = `[Storage:${this.type}]`;
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case "debug":
        logger.debug(fullMessage, context);
        break;
      case "info":
        logger.info(fullMessage, context);
        break;
      case "warn":
        logger.warn(fullMessage, context);
        break;
      case "error":
        logger.error(fullMessage, context);
        break;
    }
  }

  /**
   * Create a base entity with ID and timestamps
   */
  protected createBaseEntity<
    T extends Record<string, unknown> & { id?: string },
  >(input: T): T & { id: string; createdAt: Date; updatedAt: Date } {
    const now = this.now();
    return {
      ...input,
      id: input.id || this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update entity timestamps
   */
  protected updateTimestamp<T extends { updatedAt?: Date }>(
    entity: T,
  ): T & { updatedAt: Date } {
    return {
      ...entity,
      updatedAt: this.now(),
    };
  }

  /**
   * Apply pagination to an array
   */
  protected paginate<T>(
    items: T[],
    options?: { limit?: number; offset?: number },
  ): PaginatedResult<T> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const paginated = items.slice(offset, offset + limit);

    return {
      data: paginated,
      total: items.length,
      hasMore: offset + limit < items.length,
    };
  }

  /**
   * Safely parse JSON
   */
  protected safeJsonParse<T = JsonValue>(
    value: string | null | undefined,
    defaultValue: T,
  ): T {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Safely stringify JSON
   */
  protected safeJsonStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return "{}";
    }
  }

  /**
   * Create error response for health check
   */
  protected createHealthError(error: unknown): StorageHealthResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      healthy: false,
      backend: this.type,
      error: errorMessage,
    };
  }

  /**
   * Create success response for health check
   */
  protected createHealthSuccess(latencyMs?: number): StorageHealthResult {
    return {
      healthy: true,
      backend: this.type,
      latencyMs,
    };
  }

  /**
   * Measure operation latency
   */
  protected async measureLatency<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; latencyMs: number }> {
    const start = performance.now();
    const result = await operation();
    const latencyMs = Math.round(performance.now() - start);
    return { result, latencyMs };
  }

  /**
   * Wrap an async operation in an OpenTelemetry span.
   *
   * Uses lazy dynamic imports so that OTel is never pulled into the module
   * graph for callers who do not configure telemetry.
   */
  protected async tracedOp<T>(
    operation: string,
    fn: (span: Span) => Promise<T>,
    extraAttrs?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    // Lazy import to avoid circular dependency at module load time
    const { withClientSpan } = await import("../telemetry/withSpan.js");
    const { tracers } = await import("../telemetry/tracers.js");
    return withClientSpan(
      {
        name: `storage.${operation}`,
        tracer: tracers.storage,
        attributes: {
          "storage.backend": this.type,
          "storage.operation": operation,
          ...extraAttrs,
        },
      },
      fn,
    );
  }
}
