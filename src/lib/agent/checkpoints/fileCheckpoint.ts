/**
 * FileCheckpointStore
 *
 * File-based implementation of CheckpointStore.
 * Stores JSON snapshots on disk for persistence across process restarts.
 */

import {
  writeFile,
  readFile,
  mkdir,
  readdir,
  unlink,
  access,
  rename,
} from "fs/promises";
import { join } from "path";
import type { CheckpointStore, CheckpointListing } from "./checkpointStore.js";
import type { LoopSnapshot } from "../loopTypes.js";

/**
 * File-based checkpoint store for local persistence.
 *
 * Stores checkpoint files as JSON in a configurable directory.
 * Default location: .neurolink/checkpoints/
 *
 * @example
 * ```typescript
 * const store = new FileCheckpointStore("./my-checkpoints");
 * await store.save(snapshot);
 * const loaded = await store.load(loopId);
 * ```
 */
export class FileCheckpointStore implements CheckpointStore {
  private dir: string;

  constructor(dir: string = ".neurolink/checkpoints") {
    this.dir = dir;
  }

  /**
   * Ensure the checkpoint directory exists.
   */
  private async ensureDir(): Promise<void> {
    try {
      await access(this.dir);
    } catch {
      await mkdir(this.dir, { recursive: true });
    }
  }

  /**
   * Get the file path for a loop checkpoint.
   */
  private getFilePath(loopId: string): string {
    // Sanitize loopId to prevent directory traversal
    const sanitized = loopId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return join(this.dir, `${sanitized}.json`);
  }

  async save(snapshot: LoopSnapshot): Promise<void> {
    await this.ensureDir();

    const filePath = this.getFilePath(snapshot.loopId);
    const data = JSON.stringify(snapshot, null, 2);

    // Write atomically using temp file then rename
    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, data, "utf-8");
    await rename(tempPath, filePath).catch(async () => {
      // Fallback if rename fails (e.g., cross-device)
      await writeFile(filePath, data, "utf-8");
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup error
      }
    });
  }

  async load(loopId: string): Promise<LoopSnapshot | null> {
    const filePath = this.getFilePath(loopId);

    try {
      const data = await readFile(filePath, "utf-8");
      return JSON.parse(data) as LoopSnapshot;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async list(filter?: { status?: string }): Promise<CheckpointListing[]> {
    await this.ensureDir();

    const listings: CheckpointListing[] = [];

    try {
      const files = await readdir(this.dir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      for (const file of jsonFiles) {
        try {
          const data = await readFile(join(this.dir, file), "utf-8");
          const snapshot = JSON.parse(data) as LoopSnapshot;

          if (filter?.status && snapshot.status !== filter.status) {
            continue;
          }

          listings.push({
            loopId: snapshot.loopId,
            status: snapshot.status,
            goal: snapshot.goalText.substring(0, 100),
            updatedAt: snapshot.lastCheckpointAt,
          });
        } catch {
          // Skip invalid checkpoint files
          continue;
        }
      }
    } catch {
      // Directory doesn't exist or is not readable
      return [];
    }

    // Sort by updatedAt descending (most recent first)
    return listings.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async delete(loopId: string): Promise<void> {
    const filePath = this.getFilePath(loopId);

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async exists(loopId: string): Promise<boolean> {
    const filePath = this.getFilePath(loopId);

    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
