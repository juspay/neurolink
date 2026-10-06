/**
 * Server Utilities for NeuroLink CLI
 * Shared utility functions for server management commands (serve.ts and server.ts)
 */

import { timingSafeEqual } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { ConfigurationError } from "../../lib/server/errors.js";
import { createAuthMiddleware } from "../../lib/server/middleware/auth.js";
import type { MiddlewareDefinition } from "../../lib/types/index.js";

// ============================================
// Listen Address & Access Control
// ============================================

export const DEFAULT_SERVER_PORT = 3000;

/** Comma-separated API keys; when set, every route except health needs one. */
export const SERVER_API_KEY_ENV = "NEUROLINK_SERVER_API_KEY";

/**
 * Resolve the listen port: --port, then the config file, then the PORT
 * environment variable (what container platforms set), then 3000.
 */
export function resolveServerPort(cliPort?: number, filePort?: number): number {
  const envPort = process.env.PORT?.trim();
  const port =
    cliPort ?? filePort ?? (envPort ? Number(envPort) : DEFAULT_SERVER_PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new ConfigurationError(
      `Invalid port "${cliPort ?? filePort ?? envPort}": expected an integer between 0 and 65535`,
    );
  }
  return port;
}

export function readServerApiKeys(): string[] {
  return (process.env[SERVER_API_KEY_ENV] ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

/**
 * Constant-time for equal lengths; a length mismatch returns early, which
 * reveals only the key's length, never its content.
 */
const matchesKey = (key: Buffer, token: Buffer): boolean =>
  key.length === token.length && timingSafeEqual(key, token);

/**
 * Require one of `apiKeys` as `Authorization: Bearer <key>` or `X-API-Key`.
 * Health probes stay open so orchestrators can reach them, and the dev
 * playground header cannot bypass a key the operator configured.
 */
export function createServerApiKeyMiddleware(
  apiKeys: string[],
  basePath: string,
): MiddlewareDefinition {
  const keys = apiKeys.map((key) => Buffer.from(key, "utf8"));
  return createAuthMiddleware({
    type: "custom",
    extractToken: (ctx) => {
      const bearer = /^Bearer\s+(.+)$/i.exec(
        ctx.headers["authorization"] ?? "",
      );
      return bearer?.[1] ?? ctx.headers["x-api-key"] ?? null;
    },
    validate: async (token) => {
      const candidate = Buffer.from(token, "utf8");
      return keys.some((key) => matchesKey(key, candidate))
        ? { id: "api-key" }
        : null;
    },
    skipPaths: [`${basePath.replace(/\/+$/, "")}/health`],
    skipDevPlayground: false,
  });
}

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

/**
 * Whether a saved server state belongs to a different, still-running process.
 * A state naming our own PID is stale: a restarted container is PID 1 again
 * and would otherwise refuse to start, believing it is already running.
 */
export function isOtherServerRunning(pid: number): boolean {
  return pid !== process.pid && isProcessRunning(pid);
}

/**
 * Remove this process's state file however it exits. A graceful stop can end
 * the process before its signal handler gets to clean up (once the listener
 * closes, the event loop may drain), so this runs from the "exit" event.
 */
export function clearStateOnExit(clearState: () => void): void {
  process.once("exit", clearState);
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
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), {
      mode: 0o600,
    });
    fs.chmodSync(this.filePath, 0o600);
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
