/**
 * WorkflowStateManager - Manages workflow state and checkpoints
 *
 * Provides storage adapters for checkpoint persistence:
 * - InMemoryCheckpointStorage (default, for development)
 * - RedisCheckpointStorage (for production)
 *
 * @module workflow/workflowStateManager
 */

import type { WorkflowCheckpoint } from "../types/workflowTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Storage adapter interface for checkpoint persistence
 */
export type CheckpointStorage = {
  save(checkpoint: WorkflowCheckpoint): Promise<void>;
  load(checkpointId: string): Promise<WorkflowCheckpoint | undefined>;
  loadByRunId(runId: string): Promise<WorkflowCheckpoint | undefined>;
  list(workflowId?: string): Promise<WorkflowCheckpoint[]>;
  delete(checkpointId: string): Promise<boolean>;
  deleteByRunId(runId: string): Promise<boolean>;
};

/**
 * In-memory checkpoint storage (default)
 *
 * Suitable for development and testing. Data is not persisted
 * across process restarts.
 */
export class InMemoryCheckpointStorage implements CheckpointStorage {
  private checkpoints: Map<string, WorkflowCheckpoint> = new Map();
  private runIdIndex: Map<string, string> = new Map(); // runId -> checkpointId

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.id, checkpoint);
    this.runIdIndex.set(checkpoint.runId, checkpoint.id);
  }

  async load(checkpointId: string): Promise<WorkflowCheckpoint | undefined> {
    return this.checkpoints.get(checkpointId);
  }

  async loadByRunId(runId: string): Promise<WorkflowCheckpoint | undefined> {
    const checkpointId = this.runIdIndex.get(runId);
    if (checkpointId) {
      return this.checkpoints.get(checkpointId);
    }
    return undefined;
  }

  async list(workflowId?: string): Promise<WorkflowCheckpoint[]> {
    const all = Array.from(this.checkpoints.values());
    if (workflowId) {
      return all.filter((c) => c.workflowId === workflowId);
    }
    return all;
  }

  async delete(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (checkpoint) {
      this.runIdIndex.delete(checkpoint.runId);
      return this.checkpoints.delete(checkpointId);
    }
    return false;
  }

  async deleteByRunId(runId: string): Promise<boolean> {
    const checkpointId = this.runIdIndex.get(runId);
    if (checkpointId) {
      this.runIdIndex.delete(runId);
      return this.checkpoints.delete(checkpointId);
    }
    return false;
  }

  /**
   * Clear all checkpoints (for testing)
   */
  clear(): void {
    this.checkpoints.clear();
    this.runIdIndex.clear();
  }

  /**
   * Get count of stored checkpoints
   */
  count(): number {
    return this.checkpoints.size;
  }
}

/**
 * Redis checkpoint storage adapter
 *
 * Suitable for production deployments. Persists checkpoints
 * to Redis with configurable TTL.
 */
export class RedisCheckpointStorage implements CheckpointStorage {
  private redisClient: import("redis").RedisClientType;
  private prefix: string;
  private ttlSeconds: number;

  constructor(options: {
    redisClient: import("redis").RedisClientType;
    prefix?: string;
    ttlSeconds?: number;
  }) {
    this.redisClient = options.redisClient;
    this.prefix = options.prefix ?? "neurolink:workflow:checkpoint:";
    this.ttlSeconds = options.ttlSeconds ?? 86400 * 7; // 7 days default
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  private runIdKey(runId: string): string {
    return `${this.prefix}runid:${runId}`;
  }

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    const data = JSON.stringify(checkpoint);
    await this.redisClient.setEx(
      this.key(checkpoint.id),
      this.ttlSeconds,
      data,
    );
    await this.redisClient.setEx(
      this.runIdKey(checkpoint.runId),
      this.ttlSeconds,
      checkpoint.id,
    );
  }

  async load(checkpointId: string): Promise<WorkflowCheckpoint | undefined> {
    const data = await this.redisClient.get(this.key(checkpointId));
    if (data) {
      return JSON.parse(data) as WorkflowCheckpoint;
    }
    return undefined;
  }

  async loadByRunId(runId: string): Promise<WorkflowCheckpoint | undefined> {
    const checkpointId = await this.redisClient.get(this.runIdKey(runId));
    if (checkpointId) {
      return this.load(checkpointId);
    }
    return undefined;
  }

  async list(workflowId?: string): Promise<WorkflowCheckpoint[]> {
    const keys = await this.redisClient.keys(`${this.prefix}*`);
    const checkpoints: WorkflowCheckpoint[] = [];

    for (const key of keys) {
      if (key.includes(":runid:")) {
        continue;
      }
      const data = await this.redisClient.get(key);
      if (data) {
        const checkpoint = JSON.parse(data) as WorkflowCheckpoint;
        if (!workflowId || checkpoint.workflowId === workflowId) {
          checkpoints.push(checkpoint);
        }
      }
    }

    return checkpoints;
  }

  async delete(checkpointId: string): Promise<boolean> {
    const checkpoint = await this.load(checkpointId);
    if (checkpoint) {
      await this.redisClient.del(this.runIdKey(checkpoint.runId));
    }
    const result = await this.redisClient.del(this.key(checkpointId));
    return result > 0;
  }

  async deleteByRunId(runId: string): Promise<boolean> {
    const checkpointId = await this.redisClient.get(this.runIdKey(runId));
    if (checkpointId) {
      await this.redisClient.del(this.runIdKey(runId));
      return (await this.redisClient.del(this.key(checkpointId))) > 0;
    }
    return false;
  }
}

/**
 * WorkflowStateManager - Manages workflow state and checkpoints
 *
 * Provides a facade over storage adapters for checkpoint management.
 *
 * @example
 * ```typescript
 * // Using in-memory storage (default)
 * const stateManager = new WorkflowStateManager();
 *
 * // Using Redis storage
 * const redisClient = createClient({ url: 'redis://localhost:6379' });
 * await redisClient.connect();
 * const stateManager = new WorkflowStateManager(
 *   new RedisCheckpointStorage({ redisClient })
 * );
 *
 * // Save a checkpoint
 * await stateManager.saveCheckpoint(checkpoint);
 *
 * // Load a checkpoint
 * const loaded = await stateManager.loadCheckpoint(checkpointId);
 * ```
 */
export class WorkflowStateManager {
  private storage: CheckpointStorage;

  constructor(storage?: CheckpointStorage) {
    this.storage = storage ?? new InMemoryCheckpointStorage();
  }

  /**
   * Save a checkpoint
   */
  async saveCheckpoint(checkpoint: WorkflowCheckpoint): Promise<void> {
    await this.storage.save(checkpoint);
    logger.debug(`Saved workflow checkpoint: ${checkpoint.id}`, {
      checkpointId: checkpoint.id,
      workflowId: checkpoint.workflowId,
      runId: checkpoint.runId,
      status: checkpoint.status,
    });
  }

  /**
   * Load a checkpoint by ID
   */
  async loadCheckpoint(
    checkpointId: string,
  ): Promise<WorkflowCheckpoint | undefined> {
    return this.storage.load(checkpointId);
  }

  /**
   * Load checkpoint by run ID
   */
  async loadCheckpointByRunId(
    runId: string,
  ): Promise<WorkflowCheckpoint | undefined> {
    return this.storage.loadByRunId(runId);
  }

  /**
   * List checkpoints, optionally filtered by workflow ID
   */
  async listCheckpoints(workflowId?: string): Promise<WorkflowCheckpoint[]> {
    return this.storage.list(workflowId);
  }

  /**
   * Delete a checkpoint by ID
   */
  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const deleted = await this.storage.delete(checkpointId);
    if (deleted) {
      logger.debug(`Deleted workflow checkpoint: ${checkpointId}`, {
        checkpointId,
      });
    }
    return deleted;
  }

  /**
   * Delete checkpoint by run ID
   */
  async deleteCheckpointByRunId(runId: string): Promise<boolean> {
    return this.storage.deleteByRunId(runId);
  }

  /**
   * Set custom storage adapter at runtime
   */
  setStorage(storage: CheckpointStorage): void {
    this.storage = storage;
  }

  /**
   * Get the current storage adapter
   */
  getStorage(): CheckpointStorage {
    return this.storage;
  }
}
