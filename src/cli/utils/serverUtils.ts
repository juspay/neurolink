/**
 * Server Utilities for NeuroLink CLI
 * Shared utility functions for server management commands (serve.ts and server.ts)
 */

import { timingSafeEqual } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { DEFAULT_SERVER_HOST } from "../../lib/server/abstract/baseServerAdapter.js";
import { ConfigurationError } from "../../lib/server/errors.js";
import { createAuthMiddleware } from "../../lib/server/middleware/auth.js";
import { isLoopbackAddress } from "../../lib/server/utils/clientAddress.js";
import { stripQuery } from "../../lib/server/utils/pathMatch.js";
import type { MiddlewareDefinition } from "../../lib/types/index.js";

// ============================================
// Listen Address & Access Control
// ============================================

export const DEFAULT_SERVER_PORT = 3000;

/** The interface `neurolink serve` binds unless told otherwise: this host only. */
export { DEFAULT_SERVER_HOST };

/** Comma-separated API keys; when set, every route except the health probes needs one. */
export const SERVER_API_KEY_ENV = "NEUROLINK_SERVER_API_KEY";

/**
 * `=1` lets `neurolink serve` listen on a non-loopback host with no API key,
 * and serves the tool and MCP execution routes to anyone who can reach it.
 */
export const SERVER_ALLOW_UNAUTHENTICATED_ENV =
  "NEUROLINK_SERVER_ALLOW_UNAUTHENTICATED";

/** `=1` keeps the built-in tools (filesystem among them) in the server's registry. */
export const SERVER_ENABLE_BUILTIN_TOOLS_ENV =
  "NEUROLINK_SERVER_ENABLE_BUILTIN_TOOLS";

/** `=1` lets the transcription WebSocket take the API key as `?token=`. */
export const SERVER_WS_ALLOW_QUERY_TOKEN_ENV =
  "NEUROLINK_SERVER_WS_ALLOW_QUERY_TOKEN";

/** Whether `name` is set to `1` (trimmed) in the environment. */
export function envFlag(name: string): boolean {
  return process.env[name]?.trim() === "1";
}

/** `true` when `host` names only this machine (`127.0.0.1`, `::1`, `localhost`). */
export function isLoopbackHost(host: string): boolean {
  return isLoopbackAddress(host);
}

/**
 * Why `neurolink serve` must not start as asked, or `undefined` when it may.
 * A listener the network can reach with no API key hands every route, tool
 * execution included, to anyone who finds the port; the operator has to say so.
 */
export function unauthenticatedBindRefusal(options: {
  host: string;
  apiKeyCount: number;
  allowUnauthenticated: boolean;
}): string | undefined {
  if (
    options.apiKeyCount > 0 ||
    options.allowUnauthenticated ||
    isLoopbackHost(options.host)
  ) {
    return undefined;
  }
  return (
    `Refusing to listen on ${options.host} without authentication: every route, including tool execution, would be open to anyone who can reach this port. ` +
    `Set ${SERVER_API_KEY_ENV}, bind a loopback address (--host ${DEFAULT_SERVER_HOST}), or pass --allow-unauthenticated (${SERVER_ALLOW_UNAUTHENTICATED_ENV}=1) to run open on purpose.`
  );
}

/**
 * The paths a key never guards: the liveness, readiness and startup probes an
 * orchestrator calls with no credentials, and the basic health check. An
 * exact list: `/health/detailed` reports the runtime and the MCP inventory,
 * and `/version` the Node version, so both need the key like any other route.
 */
export function healthExemptPaths(basePath: string): string[] {
  const health = `${basePath.replace(/\/+$/, "")}/health`;
  return [health, `${health}/live`, `${health}/ready`, `${health}/startup`];
}

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
 * The health probes (see `healthExemptPaths`) stay open so orchestrators can
 * reach them, and the dev playground header cannot bypass a key the operator
 * configured. The exemption is an exact match on the path, made here rather
 * than through the adapters' `excludePaths`, whose entries cover a subtree:
 * `/health` used to exempt `/health/detailed` and even `/health/api/version`.
 *
 * Every holder of a key gets the same `{ id: "api-key" }`, marked `shared` so
 * the agent routes know it names no person and do not warn when a request
 * names its own userId.
 */
export function createServerApiKeyMiddleware(
  apiKeys: string[],
  basePath: string,
): MiddlewareDefinition {
  const keys = apiKeys.map((key) => Buffer.from(key, "utf8"));
  const exempt = new Set(healthExemptPaths(basePath));
  const inner = createAuthMiddleware({
    type: "custom",
    extractToken: (ctx) => {
      const bearer = /^Bearer\s+(\S.*)$/i.exec(
        ctx.headers["authorization"] ?? "",
      );
      return bearer?.[1] ?? ctx.headers["x-api-key"] ?? null;
    },
    validate: async (token) => {
      const candidate = Buffer.from(token, "utf8");
      return keys.some((key) => matchesKey(key, candidate))
        ? { id: "api-key", shared: true }
        : null;
    },
    skipDevPlayground: false,
  });
  return {
    ...inner,
    name: "api-key",
    excludePaths: undefined,
    handler: (ctx, next) =>
      exempt.has(stripQuery(ctx.path).replace(/\/+$/, "") || "/")
        ? next()
        : inner.handler(ctx, next),
  };
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
