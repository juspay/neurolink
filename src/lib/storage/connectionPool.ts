/**
 * Connection Pool Utilities
 *
 * Generic connection pooling utilities for storage adapters.
 * Provides a reusable pool implementation with health checking and metrics.
 */

import { logger } from "../utils/logger.js";
import type {
  ConnectionPoolConfig,
  ConnectionPoolStats,
  PoolableConnection,
  ConnectionFactory,
} from "../types/index.js";

/**
 * Generic connection pool implementation
 *
 * Provides pooled access to connections with automatic health checking,
 * connection recycling, and metrics collection.
 */
export class ConnectionPool<T extends PoolableConnection> {
  /** Available (idle) connections */
  private idle: T[] = [];

  /** Connections currently in use */
  private active = new Set<T>();

  /** Pending connection requests */
  private pending: Array<{
    resolve: (conn: T) => void;
    reject: (err: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  /** Pool configuration */
  private config: Required<ConnectionPoolConfig>;

  /** Connection factory */
  private factory: ConnectionFactory<T>;

  /** Whether pool is closed */
  private closed = false;

  /** Idle timeout timers */
  private idleTimers = new Map<T, NodeJS.Timeout>();

  /** Health check interval */
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(factory: ConnectionFactory<T>, config?: ConnectionPoolConfig) {
    this.factory = factory;
    this.config = {
      minSize: config?.minSize ?? 0,
      maxSize: config?.maxSize ?? 10,
      idleTimeoutMs: config?.idleTimeoutMs ?? 30000,
      acquireTimeoutMs: config?.acquireTimeoutMs ?? 5000,
      createRetryIntervalMs: config?.createRetryIntervalMs ?? 1000,
      createMaxRetries: config?.createMaxRetries ?? 3,
    };
  }

  /**
   * Initialize the pool with minimum connections
   */
  async initialize(): Promise<void> {
    if (this.closed) {
      throw new Error("Pool is closed");
    }

    // Create minimum connections
    const createPromises: Promise<void>[] = [];
    for (let i = 0; i < this.config.minSize; i++) {
      createPromises.push(
        this.createConnection().then((conn) => {
          this.returnToPool(conn);
        }),
      );
    }

    await Promise.all(createPromises);

    // Start health check interval
    this.startHealthCheck();

    logger.debug("[ConnectionPool] Initialized", {
      minSize: this.config.minSize,
      maxSize: this.config.maxSize,
    });
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<T> {
    if (this.closed) {
      throw new Error("Pool is closed");
    }

    // Try to get an idle connection
    while (this.idle.length > 0) {
      const conn = this.idle.pop()!;
      this.clearIdleTimer(conn);

      // Validate connection
      try {
        if (await conn.isValid()) {
          this.active.add(conn);
          return conn;
        }
      } catch {
        // Connection invalid, close it
      }

      // Close invalid connection
      try {
        await conn.close();
      } catch {
        // Ignore close errors
      }
    }

    // Create new connection if pool has room
    if (this.totalSize < this.config.maxSize) {
      const conn = await this.createConnection();
      this.active.add(conn);
      return conn;
    }

    // Wait for a connection to become available
    return this.waitForConnection();
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: T): Promise<void> {
    if (!this.active.has(connection)) {
      logger.warn("[ConnectionPool] Releasing unknown connection");
      return;
    }

    this.active.delete(connection);

    // If pool is closed, close the connection
    if (this.closed) {
      try {
        await connection.close();
      } catch {
        // Ignore close errors
      }
      return;
    }

    // If there are pending requests, give them the connection
    if (this.pending.length > 0) {
      const request = this.pending.shift()!;
      clearTimeout(request.timeout);
      this.active.add(connection);
      request.resolve(connection);
      return;
    }

    // Return to idle pool
    this.returnToPool(connection);
  }

  /**
   * Execute a function with a pooled connection
   */
  async withConnection<R>(fn: (connection: T) => Promise<R>): Promise<R> {
    const connection = await this.acquire();
    try {
      return await fn(connection);
    } finally {
      await this.release(connection);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): ConnectionPoolStats {
    return {
      totalConnections: this.totalSize,
      idleConnections: this.idle.length,
      activeConnections: this.active.size,
      pendingRequests: this.pending.length,
      maxPoolSize: this.config.maxSize,
    };
  }

  /**
   * Close all connections and shut down the pool
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Reject pending requests
    for (const request of this.pending) {
      clearTimeout(request.timeout);
      request.reject(new Error("Pool is closing"));
    }
    this.pending = [];

    // Clear idle timers
    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer);
    }
    this.idleTimers.clear();

    // Close all connections
    const closePromises: Promise<void>[] = [];

    for (const conn of this.idle) {
      closePromises.push(
        conn.close().catch((err) => {
          logger.debug("[ConnectionPool] Error closing idle connection:", err);
        }),
      );
    }
    for (const conn of this.active) {
      closePromises.push(
        conn.close().catch((err) => {
          logger.debug(
            "[ConnectionPool] Error closing active connection:",
            err,
          );
        }),
      );
    }

    await Promise.all(closePromises);

    this.idle = [];
    this.active.clear();

    logger.debug("[ConnectionPool] Closed");
  }

  /**
   * Total number of connections (idle + active)
   */
  private get totalSize(): number {
    return this.idle.length + this.active.size;
  }

  /**
   * Create a new connection with retries
   */
  private async createConnection(): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.createMaxRetries; attempt++) {
      try {
        const conn = await this.factory();
        return conn;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.createMaxRetries) {
          await this.delay(this.config.createRetryIntervalMs);
        }
      }
    }

    throw lastError || new Error("Failed to create connection");
  }

  /**
   * Return a connection to the idle pool
   */
  private returnToPool(connection: T): void {
    this.idle.push(connection);

    // Set idle timeout
    const timer = setTimeout(() => {
      this.removeIdleConnection(connection);
    }, this.config.idleTimeoutMs);

    this.idleTimers.set(connection, timer);
  }

  /**
   * Remove an idle connection
   */
  private async removeIdleConnection(connection: T): Promise<void> {
    const index = this.idle.indexOf(connection);
    if (index >= 0) {
      this.idle.splice(index, 1);
      this.clearIdleTimer(connection);

      try {
        await connection.close();
      } catch {
        // Ignore close errors
      }
    }
  }

  /**
   * Clear idle timer for a connection
   */
  private clearIdleTimer(connection: T): void {
    const timer = this.idleTimers.get(connection);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(connection);
    }
  }

  /**
   * Wait for a connection to become available
   */
  private waitForConnection(): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pending.findIndex((p) => p.resolve === resolve);
        if (index >= 0) {
          this.pending.splice(index, 1);
        }
        reject(new Error("Connection acquire timeout"));
      }, this.config.acquireTimeoutMs);

      this.pending.push({ resolve, reject, timeout });
    });
  }

  /**
   * Start periodic health check
   */
  private startHealthCheck(): void {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.checkIdleConnections();
    }, 30000);
  }

  /**
   * Check health of idle connections
   */
  private async checkIdleConnections(): Promise<void> {
    const connectionsToCheck = [...this.idle];

    for (const conn of connectionsToCheck) {
      try {
        if (!(await conn.isValid())) {
          await this.removeIdleConnection(conn);
        }
      } catch {
        await this.removeIdleConnection(conn);
      }
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a connection pool with default settings
 */
export function createConnectionPool<T extends PoolableConnection>(
  factory: ConnectionFactory<T>,
  config?: ConnectionPoolConfig,
): ConnectionPool<T> {
  return new ConnectionPool(factory, config);
}
