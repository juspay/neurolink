/**
 * NeuroLink Unified Logger Utility
 *
 * Centralized logging for the entire NeuroLink ecosystem
 * Supports both CLI --debug flag and NEUROLINK_DEBUG environment variable
 * Migrated from MCP logging with enhanced features
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

// Pre-computed uppercase log levels for performance optimization
const UPPERCASE_LOG_LEVELS: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
} as const;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

class NeuroLinkLogger {
  private logLevel: LogLevel = "info";
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDebugMode: boolean;

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

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

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
      logMethod(prefix, message, data);
    } else {
      logMethod(prefix, message);
    }
  }

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

  debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: unknown): void {
    this.log("error", message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

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
   * @param args - The arguments to log. These are passed directly to `console.log`.
   */
  always(...args: unknown[]): void {
    console.log(...args);
  }
}

// Export singleton instance
const neuroLinkLogger = new NeuroLinkLogger();

// Helper function to process arguments with minimal overhead
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

// Main unified logger export
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
  // Expose structured logging methods
  setLogLevel: (level: LogLevel) => neuroLinkLogger.setLogLevel(level),
  getLogs: (level?: LogLevel) => neuroLinkLogger.getLogs(level),
  clearLogs: () => neuroLinkLogger.clearLogs(),
};

// MCP compatibility exports - all use the same unified logger
export const mcpLogger = neuroLinkLogger;
export const autoDiscoveryLogger = neuroLinkLogger;
export const registryLogger = neuroLinkLogger;
export const unifiedRegistryLogger = neuroLinkLogger;

// Global log level setter
export function setGlobalMCPLogLevel(level: LogLevel): void {
  neuroLinkLogger.setLogLevel(level);
}

// Export LogLevel enum for runtime use
export const LogLevels = {
  debug: "debug" as const,
  info: "info" as const,
  warn: "warn" as const,
  error: "error" as const,
} as const;

// Export types
export type { LogEntry };
