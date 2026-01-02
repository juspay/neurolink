/**
 * Utility module types - extracted from utils module files
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import type { UnifiedGenerationOptions } from "./generateTypes.js";
import type { ExecutionContext } from "./tools.js";

/**
 * Represents the available logging severity levels.
 * - debug: Detailed information for debugging purposes
 * - info: General information about system operation
 * - warn: Potential issues that don't prevent operation
 * - error: Critical issues that may cause failures
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

// Consolidated timeout utils types
export type TimeoutConfig = {
  operation: string;
  timeout?: number | string;
  gracefulShutdown?: boolean;
  retryOnTimeout?: boolean;
  maxRetries?: number;
  abortSignal?: AbortSignal;
};

export type TimeoutResult<T> = {
  success: boolean;
  data?: T;
  error?: Error;
  timedOut: boolean;
  executionTime: number;
  retriesUsed: number;
};

/**
 * Enhanced validation result with format checking
 */
export type APIValidationResult = {
  isValid: boolean;
  apiKey: string;
  formatValid?: boolean;
  errorType?: "missing" | "format" | "config";
  error?: string;
};

/**
 * Parsed proxy configuration
 */
export type ParsedProxyConfig = {
  protocol: string;
  hostname: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  cleanUrl: string;
};

/**
 * Represents a single log entry in the logging system.
 * Each entry contains metadata about the log event along with the actual message.
 */
export type LogEntry = {
  /** The severity level of the log entry */
  level: LogLevel;
  /** The text message to be logged */
  message: string;
  /** When the log entry was created */
  timestamp: Date;
  /** Optional additional data associated with the log entry (objects, arrays, etc.) */
  data?: unknown;
};

/**
 * Logger interface matching the logger object shape
 * Used for SDK tool contexts and other components that need a logger
 */
export type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  always: (...args: unknown[]) => void;
  table: (data: unknown) => void;
  setLogLevel: (level: LogLevel) => void;
  getLogs: (level?: LogLevel) => LogEntry[];
  clearLogs: () => void;
  setEventEmitter: (emitter: {
    emit: (event: string, ...args: unknown[]) => boolean;
  }) => void;
  clearEventEmitter: () => void;
};

// Structured error interface
export type StructuredError = {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retriable: boolean;
  context?: Record<string, unknown>;
  originalError?: Error;
  timestamp: Date;
  toolName?: string;
  serverId?: string;
};

/**
 * Enhancement types for different optimization strategies
 */
export type EnhancementType =
  | "streaming-optimization"
  | "mcp-integration"
  | "legacy-migration"
  | "context-conversion"
  | "domain-configuration"
  | "batch-parallel-enhancement"
  | "batch-hybrid-enhancement"
  | "batch-dependency-enhancement";

/**
 * Enhancement options for modifying GenerateOptions
 */
export type EnhancementOptions = {
  enhancementType: EnhancementType;
  streamingOptions?: {
    enabled?: boolean;
    chunkSize?: number;
    bufferSize?: number;
    enableProgress?: boolean;
    preferStreaming?: boolean;
  };
  mcpOptions?: {
    enableToolRegistry?: boolean;
    contextAware?: boolean;
    executionContext?: ExecutionContext;
  };
  legacyMigration?: {
    legacyContext?: Record<string, unknown>;
    domainType?: string;
    preserveFields?: boolean;
  };
  domainConfiguration?: {
    domainType: string;
    keyTerms?: string[];
    failurePatterns?: string[];
    successPatterns?: string[];
    evaluationCriteria?: Record<string, unknown>;
  };
  performance?: {
    enableAnalytics?: boolean;
    enableEvaluation?: boolean;
    timeout?: number;
  };
};

/**
 * Enhancement result with metadata
 */
export type EnhancementResult = {
  options: UnifiedGenerationOptions;
  metadata: {
    enhancementApplied: boolean;
    enhancementType: EnhancementType;
    processingTime: number;
    configurationUsed: Record<string, unknown>;
    warnings: string[];
    recommendations: string[];
  };
};

/**
 * Plugin-based conflict detection system
 * Extensible and configurable enhancement conflict resolution
 */
export type ConflictDetectionPlugin = {
  /** Plugin name for identification */
  name: string;
  /** Plugin version for compatibility checks */
  version: string;
  /** Check if two enhancement types conflict */
  detectConflict(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
    optionsA?: EnhancementOptions,
    optionsB?: EnhancementOptions,
  ): boolean;
  /** Get conflict severity (low, medium, high) */
  getConflictSeverity?(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
  ): "low" | "medium" | "high";
  /** Suggest resolution strategies */
  suggestResolution?(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
  ): string[];
};

export type RetryOptions = {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
};

export type PromptRedactionOptions = {
  /** Maximum length of redacted prompt */
  maxLength?: number;
  /** Whether to show word count */
  showWordCount?: boolean;
  /** Mask character to use for redaction */
  maskChar?: string;
};

/**
 * Validation results for environment variables
 */
export type EnvVarValidationResult = {
  isValid: boolean;
  missingVars: string[];
  invalidVars: string[];
  warnings: string[];
};
