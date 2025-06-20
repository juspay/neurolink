/**
 * NeuroLink MCP Logging System
 * Provides configurable logging with different verbosity levels
 */

export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  colors?: boolean;
  timestamp?: boolean;
}

/**
 * Configurable logger for MCP operations
 */
export class MCPLogger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    // Determine log level from environment or default to SILENT
    const envLogLevel = process.env.NEUROLINK_MCP_LOG_LEVEL?.toUpperCase();
    let defaultLevel = LogLevel.SILENT;

    switch (envLogLevel) {
      case "SILENT":
        defaultLevel = LogLevel.SILENT;
        break;
      case "ERROR":
        defaultLevel = LogLevel.ERROR;
        break;
      case "WARN":
        defaultLevel = LogLevel.WARN;
        break;
      case "INFO":
        defaultLevel = LogLevel.INFO;
        break;
      case "DEBUG":
        defaultLevel = LogLevel.DEBUG;
        break;
    }

    this.config = {
      level: defaultLevel,
      prefix: "",
      colors: true,
      timestamp: false,
      ...config,
    };
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.ERROR) {
      this.log("ERROR", message, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.WARN) {
      this.log("WARN", message, ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.INFO) {
      this.log("INFO", message, ...args);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.DEBUG) {
      this.log("DEBUG", message, ...args);
    }
  }

  /**
   * Internal logging method
   */
  private log(level: string, message: string, ...args: any[]): void {
    let output = "";

    // Add timestamp if enabled
    if (this.config.timestamp) {
      output += `[${new Date().toISOString()}] `;
    }

    // Add prefix if configured
    if (this.config.prefix) {
      output += `[${this.config.prefix}] `;
    }

    // Add log level
    if (this.config.colors) {
      switch (level) {
        case "ERROR":
          output += `\x1b[31m[${level}]\x1b[0m `;
          break;
        case "WARN":
          output += `\x1b[33m[${level}]\x1b[0m `;
          break;
        case "INFO":
          output += `\x1b[36m[${level}]\x1b[0m `;
          break;
        case "DEBUG":
          output += `\x1b[90m[${level}]\x1b[0m `;
          break;
        default:
          output += `[${level}] `;
      }
    } else {
      output += `[${level}] `;
    }

    // Add message
    output += message;

    // Use appropriate console method
    switch (level) {
      case "ERROR":
        console.error(output, ...args);
        break;
      case "WARN":
        console.warn(output, ...args);
        break;
      default:
        console.log(output, ...args);
    }
  }
}

/**
 * Create logger instances for different MCP components
 */
export const createLogger = (component: string): MCPLogger => {
  return new MCPLogger({
    prefix: component,
  });
};

/**
 * Default loggers for common MCP components
 */
export const mcpLogger = createLogger("MCP");
export const autoDiscoveryLogger = createLogger("MCPAutoDiscovery");
export const registryLogger = createLogger("MCPRegistry");
export const unifiedRegistryLogger = createLogger("UnifiedMCPRegistry");

/**
 * Utility function to set global MCP log level
 */
export function setGlobalMCPLogLevel(level: LogLevel): void {
  mcpLogger.setLevel(level);
  autoDiscoveryLogger.setLevel(level);
  registryLogger.setLevel(level);
  unifiedRegistryLogger.setLevel(level);
}

/**
 * Utility function to parse log level from string
 */
export function parseLogLevel(level: string): LogLevel {
  switch (level.toUpperCase()) {
    case "SILENT":
      return LogLevel.SILENT;
    case "ERROR":
      return LogLevel.ERROR;
    case "WARN":
      return LogLevel.WARN;
    case "INFO":
      return LogLevel.INFO;
    case "DEBUG":
      return LogLevel.DEBUG;
    default:
      return LogLevel.WARN;
  }
}
