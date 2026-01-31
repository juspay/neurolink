/**
 * Transaction Support
 *
 * Provides transaction management utilities for storage operations.
 * Supports various isolation levels and automatic retry on conflicts.
 */

import { logger } from "../utils/logger.js";
import type {
  TransactionOptions,
  TransactionContext,
  TransactionIsolationLevel,
  StorageProvider,
  TransactionState,
} from "../types/index.js";

/**
 * Transaction error with retry hint
 */
export class TransactionError extends Error {
  /** Whether the transaction can be retried */
  readonly retryable: boolean;

  /** Original error code */
  readonly code?: string;

  constructor(message: string, retryable = false, code?: string) {
    super(message);
    this.name = "TransactionError";
    this.retryable = retryable;
    this.code = code;
  }
}

/**
 * Transaction implementation
 *
 * Manages a single transaction lifecycle with commit/rollback support.
 */
export class Transaction implements TransactionContext {
  /** Unique transaction ID */
  readonly transactionId: string;

  /** Current state */
  private state: TransactionState = "pending";

  /** Transaction options */
  private options: TransactionOptions;

  /** Commit callback */
  private onCommit?: () => Promise<void>;

  /** Rollback callback */
  private onRollback?: () => Promise<void>;

  /** Timeout timer */
  private timeoutTimer?: NodeJS.Timeout;

  constructor(
    transactionId: string,
    options?: TransactionOptions,
    onCommit?: () => Promise<void>,
    onRollback?: () => Promise<void>,
  ) {
    this.transactionId = transactionId;
    this.options = options || {};
    this.onCommit = onCommit;
    this.onRollback = onRollback;

    // Set up timeout
    if (this.options.timeoutMs) {
      this.timeoutTimer = setTimeout(() => {
        this.handleTimeout();
      }, this.options.timeoutMs);
    }
  }

  /**
   * Begin the transaction
   */
  begin(): void {
    if (this.state !== "pending") {
      throw new TransactionError(
        `Cannot begin transaction in state: ${this.state}`,
      );
    }
    this.state = "active";
    logger.debug("[Transaction] Started", {
      transactionId: this.transactionId,
    });
  }

  /**
   * Commit the transaction
   */
  async commit(): Promise<void> {
    if (this.state !== "active") {
      throw new TransactionError(
        `Cannot commit transaction in state: ${this.state}`,
      );
    }

    this.clearTimeout();

    try {
      if (this.onCommit) {
        await this.onCommit();
      }
      this.state = "committed";
      logger.debug("[Transaction] Committed", {
        transactionId: this.transactionId,
      });
    } catch (error) {
      this.state = "rolledback";
      throw error;
    }
  }

  /**
   * Rollback the transaction
   */
  async rollback(): Promise<void> {
    if (this.state !== "active") {
      throw new TransactionError(
        `Cannot rollback transaction in state: ${this.state}`,
      );
    }

    this.clearTimeout();

    try {
      if (this.onRollback) {
        await this.onRollback();
      }
    } catch (error) {
      logger.warn("[Transaction] Rollback failed", {
        transactionId: this.transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.state = "rolledback";
    logger.debug("[Transaction] Rolled back", {
      transactionId: this.transactionId,
    });
  }

  /**
   * Get current state
   */
  getState(): TransactionState {
    return this.state;
  }

  /**
   * Check if transaction is active
   */
  isActive(): boolean {
    return this.state === "active";
  }

  /**
   * Handle timeout
   */
  private async handleTimeout(): Promise<void> {
    if (this.state === "active") {
      logger.warn("[Transaction] Timeout, rolling back", {
        transactionId: this.transactionId,
      });
      await this.rollback();
    }
  }

  /**
   * Clear timeout timer
   */
  private clearTimeout(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = undefined;
    }
  }
}

/**
 * Transaction manager for a storage provider
 *
 * Provides transaction lifecycle management with automatic retry support.
 */
export class TransactionManager {
  /** Active transactions */
  private activeTransactions = new Map<string, Transaction>();

  /** Transaction counter for ID generation */
  private counter = 0;

  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${++this.counter}`;
  }

  /**
   * Create a new transaction
   */
  createTransaction(
    options?: TransactionOptions,
    onCommit?: () => Promise<void>,
    onRollback?: () => Promise<void>,
  ): Transaction {
    const transactionId = this.generateTransactionId();
    const transaction = new Transaction(
      transactionId,
      options,
      onCommit,
      onRollback,
    );

    this.activeTransactions.set(transactionId, transaction);
    transaction.begin();

    return transaction;
  }

  /**
   * Execute a function within a transaction with automatic commit/rollback
   */
  async executeInTransaction<T>(
    fn: (context: TransactionContext) => Promise<T>,
    options?: TransactionOptions,
    beginFn?: () => Promise<void>,
    commitFn?: () => Promise<void>,
    rollbackFn?: () => Promise<void>,
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryOnConflict = options?.retryOnConflict ?? false;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const transaction = this.createTransaction(options, commitFn, rollbackFn);

      try {
        // Execute begin function if provided
        if (beginFn) {
          await beginFn();
        }

        // Execute the function
        const result = await fn(transaction);

        // Commit if still active
        if (transaction.isActive()) {
          await transaction.commit();
        }

        // Clean up
        this.activeTransactions.delete(transaction.transactionId);

        return result;
      } catch (error) {
        // Rollback if still active
        if (transaction.isActive()) {
          await transaction.rollback();
        }

        // Clean up
        this.activeTransactions.delete(transaction.transactionId);

        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if retryable
        const isRetryable =
          retryOnConflict &&
          error instanceof TransactionError &&
          error.retryable;

        if (!isRetryable || attempt >= maxRetries) {
          throw lastError;
        }

        logger.debug("[TransactionManager] Retrying transaction", {
          transactionId: transaction.transactionId,
          attempt: attempt + 1,
          maxRetries,
        });

        // Exponential backoff
        await this.delay(Math.min(100 * Math.pow(2, attempt), 2000));
      }
    }

    throw lastError || new Error("Transaction failed");
  }

  /**
   * Get number of active transactions
   */
  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  /**
   * Cancel all active transactions
   */
  async cancelAllTransactions(): Promise<void> {
    const transactions = Array.from(this.activeTransactions.values());

    for (const transaction of transactions) {
      if (transaction.isActive()) {
        try {
          await transaction.rollback();
        } catch {
          // Ignore rollback errors
        }
      }
    }

    this.activeTransactions.clear();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Transactional storage wrapper
 *
 * Wraps a storage provider to add transaction support where the underlying
 * provider supports it.
 */
export class TransactionalStorage {
  private storage: StorageProvider;
  private transactionManager: TransactionManager;

  constructor(storage: StorageProvider) {
    this.storage = storage;
    this.transactionManager = new TransactionManager();
  }

  /**
   * Get the underlying storage provider
   */
  getStorage(): StorageProvider {
    return this.storage;
  }

  /**
   * Execute operations within a transaction
   *
   * Note: Transaction support depends on the underlying storage provider.
   * Memory and some other backends may execute operations immediately.
   */
  async transaction<T>(
    fn: (storage: StorageProvider, context: TransactionContext) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return this.transactionManager.executeInTransaction(
      async (context) => fn(this.storage, context),
      options,
    );
  }

  /**
   * Close the transactional storage
   */
  async close(): Promise<void> {
    await this.transactionManager.cancelAllTransactions();
    await this.storage.close();
  }
}

/**
 * Create a transactional wrapper for a storage provider
 */
export function withTransactions(
  storage: StorageProvider,
): TransactionalStorage {
  return new TransactionalStorage(storage);
}

/**
 * Isolation level to SQL string mapping
 */
export const isolationLevelToSql: Record<TransactionIsolationLevel, string> = {
  read_uncommitted: "READ UNCOMMITTED",
  read_committed: "READ COMMITTED",
  repeatable_read: "REPEATABLE READ",
  serializable: "SERIALIZABLE",
};

/**
 * Check if an error indicates a serialization conflict (retryable)
 */
export function isSerializationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const retryablePatterns = [
    "serialization",
    "deadlock",
    "conflict",
    "could not serialize",
    "write conflict",
    "transaction aborted",
    "retry",
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Create a retryable transaction error from a database error
 */
export function wrapDatabaseError(error: unknown): TransactionError {
  const originalError =
    error instanceof Error ? error : new Error(String(error));
  const retryable = isSerializationError(error);
  const code = (error as { code?: string }).code;

  return new TransactionError(originalError.message, retryable, code);
}
