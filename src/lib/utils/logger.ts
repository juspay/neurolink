/**
 * NeuroLink Unified Logger Utility
 *
 * Centralized logging for the entire NeuroLink ecosystem.
 * Provides structured logging with different severity levels and consistent formatting.
 * Supports both CLI --debug flag and NEUROLINK_DEBUG environment variable.
 * Maintains compatibility with MCP logging while providing enhanced features.
 *
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Log history retention with configurable limits
 * - Conditional logging based on environment settings
 * - Structured data support for complex objects
 * - Tabular data display
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { LogEntry, LogEventEmitter, LogLevel } from "../types/index.js";

/**
 * Identifies which NeuroLink instance is emitting, for the async operation
 * currently on the stack. Populated by `runInInstanceScope()` — which the SDK
 * entry points (`generate`, `stream`, `generateText`) wrap their bodies in —
 * so a log call anywhere beneath them can be attributed without every call
 * site threading an instance through.
 *
 * Empty for logs emitted outside any call (construction, background MCP
 * reconnects, module init). Those stay unattributed rather than being charged
 * to whichever instance happens to hold the global sink.
 */
const instanceLogScope = new AsyncLocalStorage<string>();

// OTel trace context for log correlation (optional — gracefully no-ops if OTel not initialized)
let traceApi: typeof import("@opentelemetry/api") | null = null;
let traceApiPromise: Promise<
  typeof import("@opentelemetry/api") | null
> | null = null;

async function getTraceApi(): Promise<
  typeof import("@opentelemetry/api") | null
> {
  if (!traceApiPromise) {
    traceApiPromise = import("@opentelemetry/api")
      .then((mod) => {
        traceApi = mod;
        return mod;
      })
      .catch(() => null);
  }
  return traceApiPromise;
}

// Eagerly kick off the import so the cached value is available for synchronous callers
void getTraceApi();

// Pre-computed uppercase log levels for performance optimization
const UPPERCASE_LOG_LEVELS: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
} as const;

const FORMAT_FLAGS = ["--format", "-f", "--output-format"];

/**
 * True when the process was started with JSON output requested. Read from
 * argv on every write, like the `--debug` check in `shouldLog`: modules log
 * while they are still being imported, before the CLI middleware that calls
 * `setDiagnosticsToStderr` has run.
 */
function argvRequestsJsonOutput(): boolean {
  const argv = process.argv;
  return argv.some(
    (arg, index) =>
      (FORMAT_FLAGS.includes(arg) && argv[index + 1] === "json") ||
      FORMAT_FLAGS.some((flag) => arg === `${flag}=json`),
  );
}

/**
 * Best-effort isolated copy of a log call's `data` payload for one consumer.
 * `NeuroLinkLogger.log()` hands the same call's data to every scoped emitter
 * for the active instance plus the process-wide sink — a designed, supported
 * multi-consumer configuration — so a copy per consumer is what keeps one
 * consumer's in-place mutation (e.g. redacting a field before forwarding it)
 * from silently corrupting what a sibling consumer, or stored log history,
 * observes. Non-object values need no copy — they are already by-value.
 * Values `structuredClone` cannot handle (functions, etc.) are handed through
 * unchanged rather than dropped: isolation is not achievable for those
 * without lossy serialization, so that narrow case keeps the old
 * shared-reference behavior instead of losing the payload.
 */
function cloneLogData(data: unknown): unknown {
  if (data === null || typeof data !== "object") {
    return data;
  }
  try {
    return structuredClone(data);
  } catch {
    return data;
  }
}

class NeuroLinkLogger {
  private logLevel: LogLevel = "info";
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDebugMode: boolean;
  private diagnosticsToStderr = false;
  private eventEmitter?: LogEventEmitter;
  private readonly scopedEmitters = new Map<string, Set<LogEventEmitter>>();

  constructor() {
    // Cache debug mode check to avoid repeated array searches
    this.isDebugMode =
      process.argv.includes("--debug") ||
      process.env.NEUROLINK_DEBUG === "true";

    // Check NEUROLINK_LOG_LEVEL for consistency with the unified NeuroLink logger
    const envLevel = process.env.NEUROLINK_LOG_LEVEL?.toLowerCase() as LogLevel;

    if (envLevel && ["debug", "info", "warn", "error"].includes(envLevel)) {
      this.logLevel = envLevel;
    }
  }

  /**
   * Sets the event emitter that will receive log events.
   * When set, all log operations will emit a "log-event" event.
   *
   * @param emitter - The event emitter instance
   */
  setEventEmitter(emitter: LogEventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Clears the event emitter reference.
   * Should be called when a NeuroLink instance is disposed to prevent memory
   * leaks. Pass the disposing instance's emitter so a short-lived instance
   * (e.g. a worker sub-agent) only clears the bridge when it actually owns
   * it — never yanking a host instance's live log bridge.
   *
   * @param ifEmitter - When provided, clear only if it is the current emitter
   */
  clearEventEmitter(ifEmitter?: LogEventEmitter): void {
    if (ifEmitter !== undefined && this.eventEmitter !== ifEmitter) {
      return;
    }
    this.eventEmitter = undefined;
  }

  /**
   * Runs `fn` with every log call beneath it attributed to `instanceId`.
   *
   * Nesting is safe and expected: a host turn that delegates to a worker ends
   * up with the worker's id on top for the duration of the worker's call, and
   * the host's id restored afterwards. Re-entering with the same id is a
   * no-op in effect.
   *
   * @param instanceId - Identifier of the emitting NeuroLink instance
   * @param fn - Work to run inside the scope
   * @returns Whatever `fn` returns
   */
  runInInstanceScope<T>(instanceId: string, fn: () => T): T {
    return instanceLogScope.run(instanceId, fn);
  }

  /**
   * The instance id currently attributed, or undefined outside any scope.
   */
  getInstanceScope(): string | undefined {
    return instanceLogScope.getStore();
  }

  /**
   * Subscribes `emitter` to log events emitted by one instance only.
   *
   * Unlike {@link setEventEmitter} — a single process-wide sink that receives
   * everything — a scoped emitter receives only events logged inside that
   * instance's {@link runInInstanceScope}. Several emitters may share an id.
   *
   * @param instanceId - Instance whose events this emitter should receive
   * @param emitter - The sink to subscribe
   */
  addScopedEventEmitter(instanceId: string, emitter: LogEventEmitter): void {
    const existing = this.scopedEmitters.get(instanceId);
    if (existing) {
      existing.add(emitter);
      return;
    }
    this.scopedEmitters.set(instanceId, new Set([emitter]));
  }

  /**
   * Unsubscribes a scoped emitter. Must be called when the owning instance is
   * disposed, or the emitter — and everything it closes over — is retained by
   * the process-global logger for the lifetime of the process.
   *
   * @param instanceId - Instance the emitter was registered against
   * @param emitter - The sink to unsubscribe
   */
  removeScopedEventEmitter(instanceId: string, emitter: LogEventEmitter): void {
    const existing = this.scopedEmitters.get(instanceId);
    if (!existing) {
      return;
    }
    existing.delete(emitter);
    if (existing.size === 0) {
      this.scopedEmitters.delete(instanceId);
    }
  }

  /**
   * Drops every scoped emitter registered against an instance.
   *
   * Called from `NeuroLink.dispose()`: the registry lives on the
   * process-global logger, so an instance that goes away without clearing its
   * own entry would keep its sinks — and their closures — reachable forever.
   *
   * @param instanceId - Instance whose sinks should be dropped
   */
  clearScopedEventEmitters(instanceId: string): void {
    this.scopedEmitters.delete(instanceId);
  }

  /**
   * Sets the minimum log level that will be processed and output.
   * Log messages with a level lower than this will be ignored.
   *
   * @param level - The minimum log level to process ("debug", "info", "warn", or "error")
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Routes debug and info output to stderr instead of stdout. The CLI turns
   * this on for `--format json`, where stdout carries the payload and any
   * diagnostic line in it would make the output unparseable.
   *
   * @param enabled - True to send debug/info to stderr; false restores stdout
   */
  setDiagnosticsToStderr(enabled: boolean): void {
    this.diagnosticsToStderr = enabled;
  }

  /**
   * Determines whether a message with the given log level should be processed.
   * This method considers both the configured log level and the current debug mode.
   *
   * Logic:
   * 1. If not in debug mode, only error messages are allowed
   * 2. If in debug mode, messages at or above the configured log level are allowed
   *
   * @param level - The log level to check
   * @returns True if a message with this level should be logged, false otherwise
   */
  shouldLog(level: LogLevel): boolean {
    // Dynamic debug mode check to handle CLI middleware timing
    const currentDebugMode =
      process.argv.includes("--debug") ||
      process.env.NEUROLINK_DEBUG === "true";

    // Hide all logs except errors unless debugging
    if (!currentDebugMode && level !== "error") {
      return false;
    }

    const levels = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  /**
   * Generates a standardized prefix for log messages.
   * The prefix includes a timestamp and the log level in a consistent format.
   *
   * @param timestamp - ISO string representation of the log timestamp
   * @param level - The log level for this message
   * @returns Formatted prefix string like "[2025-08-18T13:45:30.123Z] [NEUROLINK:ERROR]"
   */
  private getLogPrefix(timestamp: string, level: LogLevel): string {
    return `[${timestamp}] [NEUROLINK:${UPPERCASE_LOG_LEVELS[level]}]`;
  }

  /**
   * Extracts current OTel trace context (trace_id, span_id) if available.
   * Returns empty object if OTel is not initialized or no active span exists.
   */
  private getTraceContext(): {
    trace_id?: string;
    span_id?: string;
    trace_flags?: string;
  } {
    if (!traceApi) {
      return {};
    }
    try {
      const span = traceApi.trace.getSpan(traceApi.context.active());
      if (!span) {
        return {};
      }
      const spanContext = span.spanContext();
      if (
        !spanContext ||
        spanContext.traceId === "00000000000000000000000000000000"
      ) {
        return {};
      }
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        trace_flags: String(spanContext.traceFlags),
      };
    } catch {
      return {};
    }
  }

  /**
   * Safely serialize data to fully expanded JSON string.
   * Handles circular references and non-serializable values.
   * Zero truncation — all nested objects and arrays are fully expanded.
   */
  private serializeData(data: unknown): string {
    if (data === undefined || data === null) {
      return String(data);
    }
    if (typeof data !== "object") {
      return String(data);
    }
    try {
      return JSON.stringify(data, (_key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      });
    } catch {
      // Handle circular references using a stack-based approach
      // to avoid false "[Circular]" on diamond (shared) references
      const ancestors: object[] = [];
      try {
        return JSON.stringify(data, function (_key, value) {
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            };
          }
          if (typeof value === "object" && value !== null) {
            // Only flag actual circular (ancestor) references
            if (ancestors.includes(value)) {
              return "[Circular]";
            }
            ancestors.push(value);
          }
          return value;
        });
      } catch {
        return "[Unserializable Object]";
      }
    }
  }

  /**
   * Outputs a log entry to the console based on the log level.
   * Data is fully serialized to JSON — no [Object] or [Array] truncation.
   *
   * @param level - The log level (debug, info, warn, error).
   * @param prefix - The formatted log prefix.
   * @param message - The log message.
   * @param data - Optional additional data to log.
   */
  private outputToConsole(
    level: LogLevel,
    prefix: string,
    message: string,
    data?: unknown,
  ): void {
    const toStderr = this.diagnosticsToStderr || argvRequestsJsonOutput();
    const logMethod = {
      debug: toStderr ? console.error : console.debug,
      info: toStderr ? console.error : console.info,
      warn: console.warn,
      error: console.error,
    }[level];
    const traceCtx = this.getTraceContext();
    const tracePrefix = traceCtx.trace_id
      ? ` [trace_id=${traceCtx.trace_id} span_id=${traceCtx.span_id}]`
      : "";
    if (data !== undefined && data !== null) {
      logMethod(prefix + tracePrefix, message, this.serializeData(data));
    } else {
      logMethod(prefix + tracePrefix, message);
    }
  }

  /**
   * Core internal logging method that handles:
   * 1. Creating log entries with consistent format
   * 2. Storing entries in the log history
   * 3. Managing log rotation to prevent memory issues
   * 4. Outputting formatted logs to the console
   * 5. Emitting log events if an event emitter is configured
   *
   * This is the central method called by all specific logging methods (debug, info, etc.)
   *
   * @param level - The severity level for this log entry
   * @param message - The message text to log
   * @param data - Optional additional context data to include
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    // Emit to the per-instance sinks for whichever instance is on the stack,
    // then to the process-wide sink. The two are independent: a scoped sink
    // never sees another instance's events, and the global sink still sees
    // everything, so existing setEventEmitter() consumers are unaffected.
    //
    // Several emitters may be registered for the same instance id (see
    // addScopedEventEmitter's own JSDoc), and the global sink always runs
    // alongside them — so one call's `data` object is, by design, handed to
    // more than one consumer. Each consumer below gets its OWN clone rather
    // than the shared `data` reference, so an in-place mutation by one (e.g.
    // a bridge redacting a field before forwarding it) cannot corrupt what a
    // sibling consumer sees or what `entry` — which keeps the original,
    // unmodified `data` — stores for `getLogs()`.
    const scopeId = instanceLogScope.getStore();
    const scoped =
      scopeId === undefined ? undefined : this.scopedEmitters.get(scopeId);
    if (scoped || this.eventEmitter) {
      const timestampMs = entry.timestamp.getTime();
      if (scoped) {
        for (const emitter of scoped) {
          try {
            emitter.emit("log-event", {
              level,
              message,
              timestamp: timestampMs,
              data: cloneLogData(data),
            });
          } catch {
            // Silently ignore emitter errors to avoid disrupting logging
          }
        }
      }
      if (this.eventEmitter) {
        try {
          this.eventEmitter.emit("log-event", {
            level,
            message,
            timestamp: timestampMs,
            data: cloneLogData(data),
          });
        } catch {
          // Silently ignore emitter errors to avoid disrupting logging
        }
      }
    }

    // Store log entry
    this.logs.push(entry);

    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    const timestamp = entry.timestamp.toISOString();
    const prefix = this.getLogPrefix(timestamp, level);
    this.outputToConsole(level, prefix, message, data);
  }

  /**
   * Logs a message at the debug level.
   * Used for detailed troubleshooting information.
   *
   * @param message - The message to log
   * @param data - Optional additional context data
   */
  debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  /**
   * Logs a message at the info level.
   * Used for general information about system operation.
   *
   * @param message - The message to log
   * @param data - Optional additional context data
   */
  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  /**
   * Logs a message at the warn level.
   * Used for potentially problematic situations that don't prevent operation.
   *
   * @param message - The message to log
   * @param data - Optional additional context data
   */
  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  /**
   * Logs a message at the error level.
   * Used for critical issues that may cause failures.
   *
   * @param message - The message to log
   * @param data - Optional additional context data
   */
  error(message: string, data?: unknown): void {
    this.log("error", message, data);
  }

  /**
   * Retrieves stored log entries, optionally filtered by log level.
   * Returns a copy of the log entries to prevent external modification.
   *
   * @param level - Optional log level to filter by
   * @returns Array of log entries, either all or filtered by level
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Removes all stored log entries.
   * Useful for testing or when log history is no longer needed.
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Logs messages unconditionally using `console.log`.
   *
   * This method is part of a legacy simple logger interface for backward compatibility.
   * It bypasses the structured logging mechanism and should only be used when
   * unstructured, unconditional logging is required.
   *
   * Use with caution in production environments as it outputs to the console
   * regardless of the current log level or debug mode settings.
   *
   * Use cases:
   * - Critical system information that must always be visible
   * - Status messages during initialization before logging is fully configured
   * - Debugging in environments where normal logging might be suppressed
   *
   * @param args - The arguments to log. These are passed directly to `console.log`.
   */
  always(...args: unknown[]): void {
    console.log(...args);
  }

  /**
   * Logs messages unconditionally using `console.error` (stderr).
   *
   * Same semantics as `always()` — bypasses log level checks and debug mode
   * gating — but targets stderr instead of stdout. Use this for output that
   * must stay visible (safety warnings, notices) without risking corruption
   * of machine-readable stdout (e.g. `--format json`).
   *
   * @param args - The arguments to log. These are passed directly to `console.error`.
   */
  alwaysStderr(...args: unknown[]): void {
    console.error(...args);
  }

  /**
   * Displays tabular data unconditionally using `console.table`.
   *
   * Similar to the `always` method, this bypasses log level checks and
   * will display data regardless of current logging settings.
   *
   * Important differences from other logging methods:
   * - Does NOT store entries in the log history
   * - Does NOT use the structured logging format with timestamps and prefixes
   * - Outputs directly to console without additional formatting
   *
   * Particularly useful for:
   * - Displaying structured data in a readable format during debugging
   * - Showing configuration options and their current values
   * - Presenting comparison data between different system states
   * - Performance metrics and timing data
   *
   * @param data - The data to display in table format. Can be an array of objects or an object with key-value pairs.
   */
  table(data: unknown): void {
    console.table(data);
  }
}

// Export singleton instance to ensure consistent logging across the application
const neuroLinkLogger = new NeuroLinkLogger();

/**
 * Helper function to process logger arguments with minimal overhead.
 * Handles variable argument patterns and ensures safe serialization of objects.
 *
 * This function:
 * 1. Extracts the first argument as the message
 * 2. Handles serialization of non-string first arguments
 * 3. Collects remaining arguments as additional data
 * 4. Passes the processed arguments to the actual logging method
 *
 * @param args - Array of arguments passed to the logger
 * @param logMethod - Function that will perform the actual logging
 */
function processLoggerArgs(
  args: unknown[],
  logMethod: (message: string, data?: unknown) => void,
): void {
  if (args.length === 0) {
    return;
  }

  // Serialize the first argument robustly to handle complex objects
  const message = (() => {
    try {
      return typeof args[0] === "string" ? args[0] : JSON.stringify(args[0]);
    } catch {
      return "[Unserializable Object]";
    }
  })();
  const data =
    args.length === 2 ? args[1] : args.length > 2 ? args.slice(1) : undefined;
  logMethod(message, data);
}

/**
 * Main unified logger export that provides a simplified API for logging.
 * This is the primary interface that should be used by application code.
 *
 * Features:
 * - Convenient logging methods (debug, info, warn, error)
 * - Unconditional logging (always, table)
 * - Log level control and configuration
 * - Log history management
 * - Event emission for all log operations (when emitter is configured)
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (neuroLinkLogger.shouldLog("debug")) {
      processLoggerArgs(args, (message, data) =>
        neuroLinkLogger.debug(message, data),
      );
    }
  },
  info: (...args: unknown[]) => {
    if (neuroLinkLogger.shouldLog("info")) {
      processLoggerArgs(args, (message, data) =>
        neuroLinkLogger.info(message, data),
      );
    }
  },
  warn: (...args: unknown[]) => {
    if (neuroLinkLogger.shouldLog("warn")) {
      processLoggerArgs(args, (message, data) =>
        neuroLinkLogger.warn(message, data),
      );
    }
  },
  error: (...args: unknown[]) => {
    if (neuroLinkLogger.shouldLog("error")) {
      processLoggerArgs(args, (message, data) =>
        neuroLinkLogger.error(message, data),
      );
    }
  },
  always: (...args: unknown[]) => {
    neuroLinkLogger.always(...args);
  },
  alwaysStderr: (...args: unknown[]) => {
    neuroLinkLogger.alwaysStderr(...args);
  },
  table: (data: unknown) => {
    neuroLinkLogger.table(data);
  },
  // Expose log-level check for gating expensive operations
  shouldLog: (level: LogLevel) => neuroLinkLogger.shouldLog(level),
  // Expose structured logging methods
  setLogLevel: (level: LogLevel) => neuroLinkLogger.setLogLevel(level),
  setDiagnosticsToStderr: (enabled: boolean) =>
    neuroLinkLogger.setDiagnosticsToStderr(enabled),
  getLogs: (level?: LogLevel) => neuroLinkLogger.getLogs(level),
  clearLogs: () => neuroLinkLogger.clearLogs(),
  setEventEmitter: (emitter: LogEventEmitter) =>
    neuroLinkLogger.setEventEmitter(emitter),
  clearEventEmitter: (ifEmitter?: LogEventEmitter) =>
    neuroLinkLogger.clearEventEmitter(ifEmitter),
  // Per-instance routing (see NeuroLinkLogger.runInInstanceScope)
  runInInstanceScope: <T>(instanceId: string, fn: () => T) =>
    neuroLinkLogger.runInInstanceScope(instanceId, fn),
  getInstanceScope: () => neuroLinkLogger.getInstanceScope(),
  addScopedEventEmitter: (instanceId: string, emitter: LogEventEmitter) =>
    neuroLinkLogger.addScopedEventEmitter(instanceId, emitter),
  removeScopedEventEmitter: (instanceId: string, emitter: LogEventEmitter) =>
    neuroLinkLogger.removeScopedEventEmitter(instanceId, emitter),
  clearScopedEventEmitters: (instanceId: string) =>
    neuroLinkLogger.clearScopedEventEmitters(instanceId),
};

/**
 * MCP compatibility exports - all use the same unified logger instance.
 * These exports maintain backward compatibility with code that expects
 * separate loggers for different MCP components, while actually using
 * the same underlying logger instance.
 */
export const mcpLogger = neuroLinkLogger;
export const autoDiscoveryLogger = neuroLinkLogger;
export const registryLogger = neuroLinkLogger;
export const unifiedRegistryLogger = neuroLinkLogger;

/**
 * Sets the global log level for all MCP-related logging.
 * This function provides a convenient way to adjust logging verbosity
 * for all MCP components at once.
 *
 * @param level - The log level to set ("debug", "info", "warn", or "error")
 */
export function setGlobalMCPLogLevel(level: LogLevel): void {
  neuroLinkLogger.setLogLevel(level);
}

/**
 * Export LogLevel enum for runtime use.
 * Provides type-safe log level constants for use in application code.
 *
 * Example usage:
 * ```
 * import { logger, LogLevels } from './logger';  // Import from your project's path
 *
 * // Using the LogLevels constants (recommended for type safety):
 * logger.setLogLevel(LogLevels.debug);
 *
 * // Or directly using string values:
 * logger.setLogLevel('debug');
 * ```
 */
export const LogLevels = {
  debug: "debug" as const,
  info: "info" as const,
  warn: "warn" as const,
  error: "error" as const,
} as const;
