/**
 * CheckpointStore Interface
 *
 * Pluggable persistence for heartbeat loop state.
 * Enables crash recovery by saving and loading LoopSnapshot objects.
 */

import type { LoopSnapshot } from "../loopTypes.js";

/**
 * Minimal checkpoint listing entry for querying available checkpoints.
 */
export interface CheckpointListing {
  loopId: string;
  status: string;
  goal: string;
  updatedAt: string;
}

/**
 * CheckpointStore persists LoopSnapshot objects for crash recovery.
 *
 * Implementations provided:
 * - FileCheckpointStore: JSON files on disk (.neurolink/checkpoints/)
 * - RedisCheckpointStore: Redis key-value store (production)
 * - InMemoryCheckpointStore: In-memory Map (testing)
 */
export interface CheckpointStore {
  /**
   * Save a snapshot to the store.
   * @param snapshot - The loop state to persist
   */
  save(snapshot: LoopSnapshot): Promise<void>;

  /**
   * Load a snapshot from the store.
   * @param loopId - The unique loop identifier
   * @returns The persisted snapshot, or null if not found
   */
  load(loopId: string): Promise<LoopSnapshot | null>;

  /**
   * List available checkpoints.
   * @param filter - Optional filter criteria
   * @returns Array of checkpoint listings
   */
  list(filter?: { status?: string }): Promise<CheckpointListing[]>;

  /**
   * Delete a checkpoint from the store.
   * @param loopId - The unique loop identifier to delete
   */
  delete(loopId: string): Promise<void>;

  /**
   * Check if a checkpoint exists.
   * @param loopId - The unique loop identifier
   * @returns true if the checkpoint exists
   */
  exists?(loopId: string): Promise<boolean>;
}
