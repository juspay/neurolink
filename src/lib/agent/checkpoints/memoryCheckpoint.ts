/**
 * InMemoryCheckpointStore
 *
 * In-memory implementation of CheckpointStore for testing and development.
 * Data is lost when the process exits.
 */

import type { CheckpointStore, CheckpointListing } from "./checkpointStore.js";
import type { LoopSnapshot } from "../loopTypes.js";

/**
 * In-memory checkpoint store for testing.
 *
 * All data is stored in a Map and is lost when the process exits.
 * Useful for unit tests and development scenarios where persistence
 * is not required.
 *
 * @example
 * ```typescript
 * const store = new InMemoryCheckpointStore();
 * await store.save(snapshot);
 * const loaded = await store.load(loopId);
 * ```
 */
export class InMemoryCheckpointStore implements CheckpointStore {
  private store = new Map<string, LoopSnapshot>();

  async save(snapshot: LoopSnapshot): Promise<void> {
    // Deep clone to prevent external mutation
    this.store.set(snapshot.loopId, JSON.parse(JSON.stringify(snapshot)));
  }

  async load(loopId: string): Promise<LoopSnapshot | null> {
    const snapshot = this.store.get(loopId);
    if (!snapshot) {
      return null;
    }

    // Deep clone to prevent external mutation
    return JSON.parse(JSON.stringify(snapshot));
  }

  async list(filter?: { status?: string }): Promise<CheckpointListing[]> {
    const listings: CheckpointListing[] = [];

    for (const snapshot of this.store.values()) {
      if (filter?.status && snapshot.status !== filter.status) {
        continue;
      }

      listings.push({
        loopId: snapshot.loopId,
        status: snapshot.status,
        goal: snapshot.goalText.substring(0, 100),
        updatedAt: snapshot.lastCheckpointAt,
      });
    }

    // Sort by updatedAt descending (most recent first)
    return listings.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async delete(loopId: string): Promise<void> {
    this.store.delete(loopId);
  }

  async exists(loopId: string): Promise<boolean> {
    return this.store.has(loopId);
  }

  /**
   * Get the number of checkpoints stored.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Clear all checkpoints.
   */
  clear(): void {
    this.store.clear();
  }
}
