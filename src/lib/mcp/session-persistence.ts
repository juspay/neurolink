/**
 * NeuroLink Session Persistence Layer
 * Provides file-based persistence for sessions with atomic writes and recovery
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { existsSync } from "fs";
import type { OrchestratorSession } from "./session-manager.js";

/**
 * Session file metadata
 */
interface SessionFile {
  session: OrchestratorSession;
  checksum: string;
  version: string;
  lastSaved: number;
}

/**
 * Persistence options
 */
export interface PersistenceOptions {
  directory?: string;
  snapshotInterval?: number; // ms
  retentionPeriod?: number; // ms
  enableChecksum?: boolean;
  maxRetries?: number;
}

/**
 * Session Persistence Manager
 * Handles saving and loading sessions to/from disk with recovery mechanisms
 */
export class SessionPersistence {
  private directory: string;
  private snapshotInterval: number;
  private retentionPeriod: number;
  private enableChecksum: boolean;
  private maxRetries: number;
  private snapshotTimer: NodeJS.Timeout | null = null;
  private sessionMap: Map<string, OrchestratorSession>;

  constructor(
    sessionMap: Map<string, OrchestratorSession>,
    options: PersistenceOptions = {},
  ) {
    this.sessionMap = sessionMap;
    this.directory = options.directory || ".neurolink/sessions";
    this.snapshotInterval = options.snapshotInterval || 30000; // 30 seconds
    this.retentionPeriod = options.retentionPeriod || 86400000; // 24 hours
    this.enableChecksum = options.enableChecksum ?? true;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Initialize persistence layer
   */
  async initialize(): Promise<void> {
    // Create sessions directory if it doesn't exist
    await this.ensureDirectory();

    // Load existing sessions
    await this.loadSessions();

    // Start snapshot timer
    this.startSnapshotTimer();

    if (process.env.NEUROLINK_DEBUG === "true") {
      console.log(
        `[SessionPersistence] Initialized with directory: ${this.directory}`,
      );
    }
  }

  /**
   * Ensure sessions directory exists
   */
  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true });
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Serialize session to JSON with metadata
   */
  private serializeSession(session: OrchestratorSession): string {
    // Convert Map to array for JSON serialization
    const sessionData = {
      ...session,
      state: Array.from(session.state.entries()),
    };

    const fileData: SessionFile = {
      session: sessionData as any,
      checksum: "",
      version: "1.0",
      lastSaved: Date.now(),
    };

    if (this.enableChecksum) {
      // First serialization without checksum
      const tempJsonData = JSON.stringify(fileData, null, 2);
      // Calculate checksum based on the first serialization
      fileData.checksum = this.calculateChecksum(tempJsonData);
    }

    // Final serialization with checksum included
    return JSON.stringify(fileData, null, 2);
  }

  /**
   * Deserialize session from JSON
   */
  private deserializeSession(data: string): OrchestratorSession | null {
    try {
      const fileData: SessionFile = JSON.parse(data);

      // Verify checksum if enabled
      if (this.enableChecksum && fileData.checksum) {
        const tempData = { ...fileData, checksum: "" };
        const expectedChecksum = this.calculateChecksum(
          JSON.stringify(tempData, null, 2),
        );

        if (fileData.checksum !== expectedChecksum) {
          console.error(
            "[SessionPersistence] Checksum mismatch, session corrupted",
          );
          return null;
        }
      }

      // Convert state array back to Map
      const session = fileData.session;
      session.state = new Map(session.state as any);

      return session;
    } catch (error) {
      console.error(
        "[SessionPersistence] Failed to deserialize session:",
        error,
      );
      return null;
    }
  }

  /**
   * Save single session with atomic write
   */
  async saveSession(
    sessionId: string,
    session: OrchestratorSession,
  ): Promise<boolean> {
    const filename = `${sessionId}.json`;
    const filepath = path.join(this.directory, filename);
    const tempPath = `${filepath}.tmp`;

    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        // Serialize session
        const data = this.serializeSession(session);

        // Write to temporary file first (atomic write pattern)
        await fs.writeFile(tempPath, data, "utf8");

        // Rename temp file to final location (atomic operation)
        await fs.rename(tempPath, filepath);

        if (process.env.NEUROLINK_DEBUG === "true") {
          console.log(`[SessionPersistence] Saved session ${sessionId}`);
        }

        return true;
      } catch (error) {
        retries++;
        console.error(
          `[SessionPersistence] Failed to save session (attempt ${retries}):`,
          error,
        );

        // Clean up temp file if it exists
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore errors when cleaning up temp file
        }

        if (retries < this.maxRetries) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retries) * 100),
          );
        }
      }
    }

    return false;
  }

  /**
   * Load single session from disk
   */
  async loadSession(sessionId: string): Promise<OrchestratorSession | null> {
    const filename = `${sessionId}.json`;
    const filepath = path.join(this.directory, filename);

    try {
      const data = await fs.readFile(filepath, "utf8");
      return this.deserializeSession(data);
    } catch (error) {
      if ((error as any).code !== "ENOENT") {
        console.error(
          `[SessionPersistence] Failed to load session ${sessionId}:`,
          error,
        );
      }
      return null;
    }
  }

  /**
   * Load all sessions from disk on startup
   */
  async loadSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.directory);
      const sessionFiles = files.filter((f) => f.endsWith(".json"));

      let loaded = 0;
      let expired = 0;

      for (const file of sessionFiles) {
        const sessionId = file.replace(".json", "");
        const session = await this.loadSession(sessionId);

        if (session) {
          // Check if session is expired
          if (session.expiresAt < Date.now()) {
            expired++;
            // Clean up expired session file
            await this.deleteSession(sessionId);
          } else {
            // Restore to memory
            this.sessionMap.set(sessionId, session);
            loaded++;
          }
        }
      }

      console.log(
        `[SessionPersistence] Loaded ${loaded} sessions, cleaned ${expired} expired sessions`,
      );
    } catch (error) {
      console.error("[SessionPersistence] Failed to load sessions:", error);
    }
  }

  /**
   * Save all active sessions (snapshot)
   */
  async saveAllSessions(): Promise<void> {
    const sessions = Array.from(this.sessionMap.entries());

    // Filter out expired sessions and create save promises
    const savePromises = sessions
      .filter(([_, session]) => session.expiresAt >= Date.now())
      .map(async ([sessionId, session]) => {
        return (await this.saveSession(sessionId, session)) ? 1 : 0;
      });

    // Execute all save operations concurrently
    const results = await Promise.all(savePromises);
    const saved = results.reduce(
      (sum: number, result: number) => sum + result,
      0,
    );

    if (process.env.NEUROLINK_DEBUG === "true") {
      console.log(
        `[SessionPersistence] Snapshot: saved ${saved}/${sessions.length} sessions`,
      );
    }
  }

  /**
   * Delete session file
   */
  async deleteSession(sessionId: string): Promise<void> {
    const filename = `${sessionId}.json`;
    const filepath = path.join(this.directory, filename);

    try {
      await fs.unlink(filepath);
      // Keep memory and disk state in sync
      this.sessionMap.delete(sessionId);
    } catch (error) {
      if ((error as any).code !== "ENOENT") {
        console.error(
          `[SessionPersistence] Failed to delete session ${sessionId}:`,
          error,
        );
      }
    }
  }

  /**
   * Clean up old session files
   */
  async cleanupOldSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.directory);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith(".json")) {
          continue;
        }

        const filepath = path.join(this.directory, file);
        const stats = await fs.stat(filepath);

        // Remove files older than retention period
        if (now - stats.mtimeMs > this.retentionPeriod) {
          await fs.unlink(filepath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(
          `[SessionPersistence] Cleaned up ${cleaned} old session files`,
        );
      }
    } catch (error) {
      console.error("[SessionPersistence] Cleanup failed:", error);
    }
  }

  /**
   * Start periodic snapshot timer
   */
  private startSnapshotTimer(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }

    this.snapshotTimer = setInterval(async () => {
      await this.saveAllSessions();
      await this.cleanupOldSessions();
    }, this.snapshotInterval);
  }

  /**
   * Stop snapshot timer
   */
  stopSnapshotTimer(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  /**
   * Shutdown persistence layer
   */
  async shutdown(): Promise<void> {
    this.stopSnapshotTimer();

    // Final snapshot before shutdown
    await this.saveAllSessions();

    console.log("[SessionPersistence] Shutdown complete");
  }
}

/**
 * Default session persistence instance
 */
export let defaultSessionPersistence: SessionPersistence | null = null;

/**
 * Initialize default session persistence
 */
export async function initializeSessionPersistence(
  sessionMap: Map<string, OrchestratorSession>,
  options?: PersistenceOptions,
): Promise<SessionPersistence> {
  if (!defaultSessionPersistence) {
    defaultSessionPersistence = new SessionPersistence(sessionMap, options);
    await defaultSessionPersistence.initialize();
  }
  return defaultSessionPersistence;
}
