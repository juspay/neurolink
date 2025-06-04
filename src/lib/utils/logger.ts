/**
 * Structured Logger Utility
 * Replaces direct console.log calls with configurable logging levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // Default to 'info' level, can be configured via environment variable
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    this.logLevel = ['debug', 'info', 'warn', 'error'].includes(envLogLevel)
      ? envLogLevel
      : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, tag: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}${contextStr}`;
  }

  debug(tag: string, message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', tag, message, context));
    }
  }

  info(tag: string, message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', tag, message, context));
    }
  }

  warn(tag: string, message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', tag, message, context));
    }
  }

  error(tag: string, message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', tag, message, context));
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for backward compatibility
export const log = {
  debug: (tag: string, message: string, context?: LogContext) => logger.debug(tag, message, context),
  info: (tag: string, message: string, context?: LogContext) => logger.info(tag, message, context),
  warn: (tag: string, message: string, context?: LogContext) => logger.warn(tag, message, context),
  error: (tag: string, message: string, context?: LogContext) => logger.error(tag, message, context)
};
