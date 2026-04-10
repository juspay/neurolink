/**
 * Server Utilities for NeuroLink CLI
 * Shared utility functions for server management commands (serve.ts and server.ts)
 */

import fs from "fs";
import os from "os";
import path from "path";

// ============================================
// State Directory Management
// ============================================

/**
 * Get the base directory for NeuroLink state files
 * @returns Path to ~/.neurolink directory
 */
export function getNeuroLinkDir(): string {
  return path.join(os.homedir(), ".neurolink");
}

/**
 * Ensure the NeuroLink state directory exists
 * Creates ~/.neurolink if it doesn't exist
 */
export function ensureStateDir(): void {
  const dir = getNeuroLinkDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================
// Process Management
// ============================================

/**
 * Check if a process with the given PID is currently running
 *
 * Uses `process.kill(pid, 0)` which tests if a process exists without sending a signal.
 *
 * **Platform Behavior:**
 * - **Unix/Linux/macOS**: Returns `true` if process exists, `false` if not.
 *   If the process exists but belongs to another user, returns `true` (via EPERM check).
 * - **Windows**: Behavior differs - `process.kill(pid, 0)` may throw even for existing
 *   processes if they are system processes or have restricted access. This function
 *   handles EPERM by returning `true`, but other Windows-specific errors may occur.
 *   For more reliable Windows process detection, consider using `tasklist` command.
 *
 * @param pid - Process ID to check
 * @returns true if the process is running, false otherwise
 */
export function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 tests if process exists without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // EPERM means process exists but we lack permission to send signals to it
    return code === "EPERM";
  }
}

// ============================================
// Time Formatting
// ============================================

/**
 * Format a duration in milliseconds to a human-readable uptime string
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "2d 5h 30m" or "45m 30s"
 */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// ============================================
// Generic State File Management
// ============================================

/**
 * Generic state file manager for server state persistence
 * @template T - Type of the state object
 */
export class StateFileManager<T> {
  private filePath: string;

  /**
   * Create a new state file manager
   * @param filename - Name of the state file (e.g., "serve-state.json")
   * @param baseDir - Optional base directory (defaults to ~/.neurolink)
   */
  constructor(filename: string, baseDir?: string) {
    this.filePath = path.join(baseDir ?? getNeuroLinkDir(), filename);
  }

  /**
   * Get the full path to the state file
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Save state to the state file
   * @param state - State object to save
   */
  save(state: T): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }

  /**
   * Load state from the state file
   * @returns The state object, or null if the file doesn't exist or is invalid
   */
  load(): T | null {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf8");
        return JSON.parse(content) as T;
      }
    } catch {
      // Ignore errors - return null for missing or invalid files
    }
    return null;
  }

  /**
   * Clear (delete) the state file
   */
  clear(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
    } catch {
      // Ignore errors when clearing
    }
  }

  /**
   * Check if state file exists
   */
  exists(): boolean {
    return fs.existsSync(this.filePath);
  }
}
