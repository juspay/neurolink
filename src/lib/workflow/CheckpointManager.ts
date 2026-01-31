/**
 * Checkpoint Manager
 *
 * State persistence for workflow checkpoints with support for
 * in-memory and Redis storage backends.
 *
 * @module workflow/CheckpointManager
 */

import { randomUUID } from "crypto";
import { logger } from "../utils/logger.js";
import { CheckpointError, WorkflowErrorCodes } from "./errors/WorkflowError.js";
import type {
  CheckpointStorage,
  CheckpointStorageConfig,
  MemoryCheckpointConfig,
  RedisCheckpointConfig,
  WorkflowCheckpoint,
} from "./types/workflowTypes.js";

// =============================================================================
// Memory Storage
// =============================================================================

/**
 * In-memory checkpoint storage
 */
export class MemoryCheckpointStorage implements CheckpointStorage {
  private checkpoints: Map<string, WorkflowCheckpoint> = new Map();
  private runCheckpoints: Map<string, string[]> = new Map();
  private workflowCheckpoints: Map<string, string[]> = new Map();
  private maxCheckpoints: number;

  constructor(config: MemoryCheckpointConfig) {
    this.maxCheckpoints = config.maxCheckpoints ?? 100;
  }

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    // Store checkpoint
    this.checkpoints.set(checkpoint.id, checkpoint);

    // Index by run ID
    if (!this.runCheckpoints.has(checkpoint.runId)) {
      this.runCheckpoints.set(checkpoint.runId, []);
    }
    this.runCheckpoints.get(checkpoint.runId)!.push(checkpoint.id);

    // Index by workflow ID
    if (!this.workflowCheckpoints.has(checkpoint.workflowId)) {
      this.workflowCheckpoints.set(checkpoint.workflowId, []);
    }
    this.workflowCheckpoints.get(checkpoint.workflowId)!.push(checkpoint.id);

    // Enforce max checkpoints
    this.enforceMaxCheckpoints();

    logger.debug(`Saved checkpoint: ${checkpoint.id}`, {
      workflowId: checkpoint.workflowId,
      runId: checkpoint.runId,
    });
  }

  async load(checkpointId: string): Promise<WorkflowCheckpoint | null> {
    return this.checkpoints.get(checkpointId) ?? null;
  }

  async loadLatest(runId: string): Promise<WorkflowCheckpoint | null> {
    const checkpointIds = this.runCheckpoints.get(runId);
    if (!checkpointIds || checkpointIds.length === 0) {
      return null;
    }

    // Return the most recent checkpoint
    const latestId = checkpointIds[checkpointIds.length - 1];
    return this.checkpoints.get(latestId) ?? null;
  }

  async list(workflowId: string, limit?: number): Promise<WorkflowCheckpoint[]> {
    const checkpointIds = this.workflowCheckpoints.get(workflowId) ?? [];
    const checkpoints: WorkflowCheckpoint[] = [];

    for (const id of checkpointIds) {
      const checkpoint = this.checkpoints.get(id);
      if (checkpoint) {
        checkpoints.push(checkpoint);
      }
    }

    // Sort by timestamp descending
    checkpoints.sort((a, b) => b.timestamp - a.timestamp);

    return limit ? checkpoints.slice(0, limit) : checkpoints;
  }

  async delete(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return false;
    }

    // Remove from main store
    this.checkpoints.delete(checkpointId);

    // Remove from run index
    const runCheckpoints = this.runCheckpoints.get(checkpoint.runId);
    if (runCheckpoints) {
      const index = runCheckpoints.indexOf(checkpointId);
      if (index > -1) {
        runCheckpoints.splice(index, 1);
      }
    }

    // Remove from workflow index
    const workflowCheckpoints = this.workflowCheckpoints.get(checkpoint.workflowId);
    if (workflowCheckpoints) {
      const index = workflowCheckpoints.indexOf(checkpointId);
      if (index > -1) {
        workflowCheckpoints.splice(index, 1);
      }
    }

    logger.debug(`Deleted checkpoint: ${checkpointId}`);
    return true;
  }

  async deleteAll(runId: string): Promise<number> {
    const checkpointIds = this.runCheckpoints.get(runId) ?? [];
    let count = 0;

    for (const id of [...checkpointIds]) {
      if (await this.delete(id)) {
        count++;
      }
    }

    return count;
  }

  private enforceMaxCheckpoints(): void {
    if (this.checkpoints.size <= this.maxCheckpoints) {
      return;
    }

    // Get all checkpoints sorted by timestamp
    const sortedCheckpoints = Array.from(this.checkpoints.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest checkpoints
    const toRemove = sortedCheckpoints.slice(0, this.checkpoints.size - this.maxCheckpoints);

    for (const checkpoint of toRemove) {
      this.delete(checkpoint.id);
    }
  }

  /**
   * Clear all checkpoints (for testing)
   */
  clear(): void {
    this.checkpoints.clear();
    this.runCheckpoints.clear();
    this.workflowCheckpoints.clear();
  }
}

// =============================================================================
// Redis Storage
// =============================================================================

/**
 * Redis checkpoint storage
 * Note: Requires redis package to be installed
 */
export class RedisCheckpointStorage implements CheckpointStorage {
  private config: RedisCheckpointConfig;
  private client: unknown | null = null;
  private keyPrefix: string;
  private ttlSeconds: number;

  constructor(config: RedisCheckpointConfig) {
    this.config = config;
    this.keyPrefix = config.keyPrefix ?? "neurolink:workflow:checkpoint:";
    this.ttlSeconds = config.ttlSeconds ?? 86400; // 24 hours default
  }

  private async getClient(): Promise<unknown> {
    if (this.client) {
      return this.client;
    }

    try {
      // Dynamic import of redis
      const redis = await import("redis");
      this.client = redis.createClient({ url: this.config.url });
      await (this.client as { connect: () => Promise<void> }).connect();
      return this.client;
    } catch (error) {
      throw new CheckpointError(
        "Failed to connect to Redis for checkpoint storage",
        WorkflowErrorCodes.CHECKPOINT_FAILED,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  private getKey(checkpointId: string): string {
    return `${this.keyPrefix}${checkpointId}`;
  }

  private getRunKey(runId: string): string {
    return `${this.keyPrefix}run:${runId}`;
  }

  private getWorkflowKey(workflowId: string): string {
    return `${this.keyPrefix}workflow:${workflowId}`;
  }

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    const client = (await this.getClient()) as {
      set: (key: string, value: string, options?: { EX?: number }) => Promise<void>;
      rPush: (key: string, value: string) => Promise<void>;
      expire: (key: string, seconds: number) => Promise<void>;
    };

    // Save checkpoint
    await client.set(this.getKey(checkpoint.id), JSON.stringify(checkpoint), {
      EX: this.ttlSeconds,
    });

    // Add to run index
    await client.rPush(this.getRunKey(checkpoint.runId), checkpoint.id);
    await client.expire(this.getRunKey(checkpoint.runId), this.ttlSeconds);

    // Add to workflow index
    await client.rPush(this.getWorkflowKey(checkpoint.workflowId), checkpoint.id);
    await client.expire(this.getWorkflowKey(checkpoint.workflowId), this.ttlSeconds);

    logger.debug(`Saved checkpoint to Redis: ${checkpoint.id}`);
  }

  async load(checkpointId: string): Promise<WorkflowCheckpoint | null> {
    const client = (await this.getClient()) as {
      get: (key: string) => Promise<string | null>;
    };

    const data = await client.get(this.getKey(checkpointId));
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as WorkflowCheckpoint;
    } catch {
      throw new CheckpointError(
        `Failed to parse checkpoint: ${checkpointId}`,
        WorkflowErrorCodes.CHECKPOINT_CORRUPTED,
        { checkpointId },
      );
    }
  }

  async loadLatest(runId: string): Promise<WorkflowCheckpoint | null> {
    const client = (await this.getClient()) as {
      lRange: (key: string, start: number, end: number) => Promise<string[]>;
    };

    const ids = await client.lRange(this.getRunKey(runId), -1, -1);
    if (ids.length === 0) {
      return null;
    }

    return this.load(ids[0]);
  }

  async list(workflowId: string, limit?: number): Promise<WorkflowCheckpoint[]> {
    const client = (await this.getClient()) as {
      lRange: (key: string, start: number, end: number) => Promise<string[]>;
    };

    const ids = await client.lRange(this.getWorkflowKey(workflowId), limit ? -limit : 0, -1);

    const checkpoints: WorkflowCheckpoint[] = [];
    for (const id of ids) {
      const checkpoint = await this.load(id);
      if (checkpoint) {
        checkpoints.push(checkpoint);
      }
    }

    return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
  }

  async delete(checkpointId: string): Promise<boolean> {
    const client = (await this.getClient()) as {
      del: (key: string) => Promise<number>;
    };

    const result = await client.del(this.getKey(checkpointId));
    return result > 0;
  }

  async deleteAll(runId: string): Promise<number> {
    const client = (await this.getClient()) as {
      lRange: (key: string, start: number, end: number) => Promise<string[]>;
      del: (key: string) => Promise<number>;
    };

    const ids = await client.lRange(this.getRunKey(runId), 0, -1);
    let count = 0;

    for (const id of ids) {
      if (await this.delete(id)) {
        count++;
      }
    }

    await client.del(this.getRunKey(runId));
    return count;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await (this.client as { disconnect: () => Promise<void> }).disconnect();
      this.client = null;
    }
  }
}

// =============================================================================
// Checkpoint Manager
// =============================================================================

/**
 * CheckpointManager - Manages workflow checkpoint persistence
 *
 * Provides a unified interface for saving and loading workflow checkpoints
 * with support for multiple storage backends (memory, Redis).
 *
 * @example
 * ```typescript
 * // In-memory storage
 * const manager = new CheckpointManager({ type: 'memory', maxCheckpoints: 50 });
 *
 * // Redis storage
 * const manager = new CheckpointManager({
 *   type: 'redis',
 *   url: 'redis://localhost:6379',
 *   ttlSeconds: 3600,
 * });
 *
 * // Save a checkpoint
 * await manager.save(checkpoint);
 *
 * // Load a checkpoint
 * const checkpoint = await manager.load('checkpoint-id');
 *
 * // Resume from latest checkpoint
 * const latest = await manager.loadLatest('run-id');
 * ```
 */
export class CheckpointManager {
  private storage: CheckpointStorage;

  constructor(config: CheckpointStorageConfig) {
    if (config.type === "redis") {
      this.storage = new RedisCheckpointStorage(config);
    } else {
      this.storage = new MemoryCheckpointStorage(config);
    }
  }

  /**
   * Save a checkpoint
   */
  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    // Ensure checkpoint has an ID
    if (!checkpoint.id) {
      checkpoint.id = randomUUID();
    }

    // Ensure checkpoint has a timestamp
    if (!checkpoint.timestamp) {
      checkpoint.timestamp = Date.now();
    }

    await this.storage.save(checkpoint);
  }

  /**
   * Load a checkpoint by ID
   */
  async load(checkpointId: string): Promise<WorkflowCheckpoint | null> {
    const checkpoint = await this.storage.load(checkpointId);

    if (checkpoint) {
      // Check for expiration
      if (checkpoint.suspension?.expiresAt) {
        if (Date.now() > checkpoint.suspension.expiresAt) {
          logger.warn(`Checkpoint expired: ${checkpointId}`);
          await this.delete(checkpointId);
          return null;
        }
      }
    }

    return checkpoint;
  }

  /**
   * Load the latest checkpoint for a run
   */
  async loadLatest(runId: string): Promise<WorkflowCheckpoint | null> {
    return this.storage.loadLatest(runId);
  }

  /**
   * List checkpoints for a workflow
   */
  async list(workflowId: string, limit?: number): Promise<WorkflowCheckpoint[]> {
    return this.storage.list(workflowId, limit);
  }

  /**
   * Delete a checkpoint
   */
  async delete(checkpointId: string): Promise<boolean> {
    return this.storage.delete(checkpointId);
  }

  /**
   * Delete all checkpoints for a run
   */
  async deleteAll(runId: string): Promise<number> {
    return this.storage.deleteAll(runId);
  }

  /**
   * Create a checkpoint from workflow state
   */
  createCheckpoint(params: {
    workflowId: string;
    runId: string;
    status: WorkflowCheckpoint["status"];
    state: Record<string, unknown>;
    stepOutputs: Map<string, unknown>;
    stepRecords: Map<string, unknown>;
    pendingSteps: string[];
    suspension?: WorkflowCheckpoint["suspension"];
  }): WorkflowCheckpoint {
    return {
      id: randomUUID(),
      workflowId: params.workflowId,
      runId: params.runId,
      timestamp: Date.now(),
      status: params.status,
      state: params.state,
      stepOutputs: Object.fromEntries(params.stepOutputs),
      stepRecords: Object.fromEntries(params.stepRecords) as Record<string, WorkflowCheckpoint["stepRecords"][string]>,
      pendingSteps: params.pendingSteps,
      suspension: params.suspension,
      version: "1.0.0",
    };
  }

  /**
   * Get storage type
   */
  getStorageType(): "memory" | "redis" {
    if (this.storage instanceof MemoryCheckpointStorage) {
      return "memory";
    }
    return "redis";
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a checkpoint manager
 */
export function createCheckpointManager(config: CheckpointStorageConfig): CheckpointManager {
  return new CheckpointManager(config);
}
