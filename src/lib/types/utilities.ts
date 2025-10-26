/**
 * Utility module types - extracted from utils module files
 */

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
 * Interface for mem0 Memory instance methods based on actual mem0ai/oss API
 */
export type Mem0Memory = {
  search(
    query: string,
    config: { userId?: string; limit?: number },
  ): Promise<{ results: Array<{ memory: string; id: string }> }>;
  add(
    messages: string,
    config: { userId?: string; metadata?: Record<string, unknown> },
  ): Promise<{ results: Array<{ id: string; memory: string }> }>;
  get(memoryId: string): Promise<{ id: string; memory: string } | null>;
  update(memoryId: string, data: string): Promise<{ message: string }>;
  delete(memoryId: string): Promise<{ message: string }>;
  history(memoryId: string): Promise<unknown[]>;
  reset(): Promise<void>;
};
