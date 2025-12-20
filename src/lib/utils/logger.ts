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

import type { LogEntry, LogLevel } from "../types/utilities.js";

// Pre-computed uppercase log levels for performance optimization
const UPPERCASE_LOG_LEVELS: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
} as const;

class NeuroLinkLogger {
  private logLevel: LogLevel = "info";
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDebugMode: boolean;
  private eventEmitter?: {
    emit: (event: string, ...args: unknown[]) => boolean;
  };

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
  setEventEmitter(emitter: {
    emit: (event: string, ...args: unknown[]) => boolean;
  }): void {
    this.eventEmitter = emitter;
  }

  /**
   * Clears the event emitter reference.
   * Should be called when a NeuroLink instance is disposed to prevent memory leaks.
   */
  clearEventEmitter(): void {
    this.eventEmitter = undefined;
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
   * Outputs a log entry to the console based on the log level.
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
    const logMethod = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }[level];
    if (data !== undefined && data !== null) {
      const stringifiedData = this.stringifyData(data);
      logMethod(prefix, message, stringifiedData);
    } else {
      logMethod(prefix, message);
    }
  }

  /**
   * Safely stringifies data for logging output.
   *
   * @param data - The data to stringify.
   * @returns Stringified representation of the data.
   */
  private stringifyData(data: unknown): string {
    try {
      if (typeof data === "string") {
        return data;
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return "[Unserializable Object]";
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

    // Emit log event if emitter is configured
    if (this.eventEmitter) {
      try {
        this.eventEmitter.emit("log-event", {
          level,
          message,
          timestamp: new Date().getTime(),
          data:
            data !== undefined && data !== null
              ? this.stringifyData(data)
              : undefined,
        });
      } catch {
        // Silently ignore emitter errors to avoid disrupting logging
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
  table: (data: unknown) => {
    neuroLinkLogger.table(data);
  },
  // Expose structured logging methods
  setLogLevel: (level: LogLevel) => neuroLinkLogger.setLogLevel(level),
  getLogs: (level?: LogLevel) => neuroLinkLogger.getLogs(level),
  clearLogs: () => neuroLinkLogger.clearLogs(),
  setEventEmitter: (emitter: {
    emit: (event: string, ...args: unknown[]) => boolean;
  }) => neuroLinkLogger.setEventEmitter(emitter),
  clearEventEmitter: () => neuroLinkLogger.clearEventEmitter(),
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
