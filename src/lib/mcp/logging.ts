/**
 * MCP Logging Utility
 * Centralized logging for the MCP ecosystem
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

class MCPLogger {
  private logLevel: LogLevel = "info";
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    // Set log level from environment
    const envLevel = process.env.MCP_LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && ["debug", "info", "warn", "error"].includes(envLevel)) {
      this.logLevel = envLevel;
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
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
    const prefix = `[${timestamp}] [MCP:${level.toUpperCase()}]`;

    switch (level) {
      case "debug":
        console.debug(prefix, message, data ? data : "");
        break;
      case "info":
        console.info(prefix, message, data ? data : "");
        break;
      case "warn":
        console.warn(prefix, message, data ? data : "");
        break;
      case "error":
        console.error(prefix, message, data ? data : "");
        break;
    }
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
}

// Export singleton instance
export const mcpLogger = new MCPLogger();

// Additional logger instances for different modules
export const autoDiscoveryLogger = mcpLogger;
export const registryLogger = mcpLogger;
export const unifiedRegistryLogger = mcpLogger;

// Global log level setter
export function setGlobalMCPLogLevel(level: LogLevel): void {
  mcpLogger.setLogLevel(level);
}

// Export LogLevel enum for runtime use
export const LogLevels = {
  debug: "debug" as const,
  info: "info" as const,
  warn: "warn" as const,
  error: "error" as const,
} as const;
