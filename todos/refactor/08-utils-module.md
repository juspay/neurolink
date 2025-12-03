# Utils Module Refactoring

**Status**: `[ ]` Not started  
**Priority**: 🟡 Medium  
**Estimated Effort**: 5-6 hours  
**Prerequisites**: 01-global-imports.md, 07-types-module.md must be completed

## Objective

Refactor the utilities module (`src/lib/utils/`) to achieve strict TypeScript compliance, improve type safety, eliminate utility code duplication, and create robust helper functions that serve the entire codebase.

## Files to Modify

### Core Utility Files

- `src/lib/utils/logger.ts` - Enhanced logging system
- `src/lib/utils/analytics.ts` - Analytics utilities
- `src/lib/utils/config.ts` - Configuration utilities
- `src/lib/utils/errors.ts` - Error handling utilities
- `src/lib/utils/validators.ts` - Validation utilities
- `src/lib/utils/index.ts` - Utility exports

### New Utility Files to Create

- `src/lib/utils/async.ts` - Async utilities
- `src/lib/utils/cache.ts` - Caching utilities
- `src/lib/utils/crypto.ts` - Cryptographic utilities
- `src/lib/utils/file.ts` - File system utilities
- `src/lib/utils/http.ts` - HTTP utilities
- `src/lib/utils/retry.ts` - Retry logic utilities
- `src/lib/utils/time.ts` - Time and date utilities

## Step-by-Step Instructions

### Step 1: Backup and Setup

```bash
# Create feature branch
git checkout -b refactor/utils-module
git add -A
git commit -m "Backup before utils module refactor"
```

### Step 2: Create Async Utilities

**File**: `src/lib/utils/async.ts`

```typescript
import type {
  Duration,
  Result,
  AsyncResult,
  Predicate,
  ErrorInfo,
} from "../types/common";

// Delay utilities
export function delay(ms: Duration): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function timeout<T>(
  promise: Promise<T>,
  ms: Duration,
  message = "Operation timed out",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms),
    ),
  ]);
}

// Retry utilities
export type RetryOptions = {
  maxAttempts: number;
  baseDelay: Duration;
  maxDelay: Duration;
  backoffMultiplier: number;
  jitter: boolean;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const config: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    shouldRetry: () => true,
    ...options,
  };

  let lastError: Error = new Error("No attempts made");

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Check if we should retry
      if (config.shouldRetry && !config.shouldRetry(lastError, attempt)) {
        break;
      }

      // Call retry callback
      config.onRetry?.(lastError, attempt);

      // Calculate delay with exponential backoff
      let delayMs =
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
      delayMs = Math.min(delayMs, config.maxDelay);

      // Add jitter to prevent thundering herd
      if (config.jitter) {
        delayMs = delayMs * (0.5 + Math.random() * 0.5);
      }

      await delay(delayMs);
    }
  }

  throw lastError;
}

// Circuit breaker pattern
export type CircuitBreakerState = "closed" | "open" | "half-open";

export type CircuitBreakerOptions = {
  failureThreshold: number;
  recoveryTimeout: Duration;
  monitoringPeriod: Duration;
  onStateChange?: (state: CircuitBreakerState) => void;
};

export class CircuitBreaker<T extends unknown[], R> {
  private state: CircuitBreakerState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly operation: (...args: T) => Promise<R>,
    options: Partial<CircuitBreakerOptions> = {},
  ) {
    this.options = {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 60000,
      ...options,
    };
  }

  async execute(...args: T): Promise<R> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.options.recoveryTimeout) {
        this.state = "half-open";
        this.options.onStateChange?.("half-open");
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await this.operation(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "half-open") {
      this.state = "closed";
      this.options.onStateChange?.("closed");
    }
    this.successCount++;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = "open";
      this.options.onStateChange?.("open");
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.options.onStateChange?.("closed");
  }
}

// Promise utilities
export async function allSettled<T>(
  promises: Promise<T>[],
): Promise<Array<Result<T, Error>>> {
  const results = await Promise.allSettled(promises);
  return results.map((result) =>
    result.status === "fulfilled"
      ? { success: true, data: result.value }
      : { success: false, error: new Error(result.reason) },
  );
}

export async function some<T>(
  promises: Promise<T>[],
  count: number,
): Promise<T[]> {
  if (count <= 0 || count > promises.length) {
    throw new Error("Invalid count for Promise.some");
  }

  return new Promise((resolve, reject) => {
    const results: T[] = [];
    const errors: Error[] = [];
    let completed = 0;

    for (const promise of promises) {
      promise
        .then((value) => {
          results.push(value);
          completed++;

          if (results.length >= count) {
            resolve(results.slice(0, count));
          } else if (completed === promises.length) {
            reject(
              new Error(
                `Only ${results.length} promises resolved, needed ${count}`,
              ),
            );
          }
        })
        .catch((error) => {
          errors.push(error as Error);
          completed++;

          if (completed === promises.length && results.length < count) {
            reject(
              new Error(
                `Only ${results.length} promises resolved, needed ${count}`,
              ),
            );
          }
        });
    }
  });
}

// Rate limiting
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(tokens = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    // Calculate wait time
    const tokensNeeded = tokens - this.tokens;
    const waitTime = (tokensNeeded / this.refillRate) * 1000;

    await delay(waitTime);
    return this.acquire(tokens);
  }

  tryAcquire(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

// Debouncing and throttling
export function debounce<T extends unknown[]>(
  func: (...args: T) => void,
  wait: Duration,
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | undefined;

  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends unknown[]>(
  func: (...args: T) => void,
  wait: Duration,
): (...args: T) => void {
  let lastTime = 0;

  return (...args: T) => {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      func(...args);
    }
  };
}

// Async queue
export class AsyncQueue<T> {
  private queue: Array<{
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  }> = [];
  private running = 0;
  private readonly concurrency: number;

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  async add<R>(task: () => Promise<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({
        task: task as () => Promise<T>,
        resolve: resolve as (value: T) => void,
        reject,
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const item = this.queue.shift()!;

    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      item.reject(error as Error);
    } finally {
      this.running--;
      this.process();
    }
  }

  size(): number {
    return this.queue.length;
  }

  pending(): number {
    return this.running;
  }

  clear(): void {
    this.queue.length = 0;
  }
}

// Event-driven async utilities
export class AsyncEventEmitter<T = unknown> {
  private listeners = new Map<
    string,
    Array<(data: T) => void | Promise<void>>
  >();

  on(event: string, listener: (data: T) => void | Promise<void>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: (data: T) => void | Promise<void>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  async emit(event: string, data: T): Promise<void> {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      await Promise.all(eventListeners.map((listener) => listener(data)));
    }
  }

  once(event: string): Promise<T> {
    return new Promise((resolve) => {
      const listener = (data: T) => {
        this.off(event, listener);
        resolve(data);
      };
      this.on(event, listener);
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Polling utilities
export type PollingOptions<T> = {
  interval: Duration;
  maxAttempts?: number;
  timeout?: Duration;
  condition: Predicate<T>;
  onPoll?: (result: T, attempt: number) => void;
};

export async function poll<T>(
  operation: () => Promise<T>,
  options: PollingOptions<T>,
): Promise<T> {
  let attempt = 0;
  const startTime = Date.now();

  while (true) {
    attempt++;

    // Check timeout
    if (options.timeout && Date.now() - startTime >= options.timeout) {
      throw new Error("Polling timed out");
    }

    // Check max attempts
    if (options.maxAttempts && attempt > options.maxAttempts) {
      throw new Error("Max polling attempts exceeded");
    }

    try {
      const result = await operation();
      options.onPoll?.(result, attempt);

      if (options.condition(result)) {
        return result;
      }
    } catch (error) {
      // Continue polling on error unless it's the last attempt
      if (options.maxAttempts && attempt >= options.maxAttempts) {
        throw error;
      }
    }

    await delay(options.interval);
  }
}
```

### Step 3: Create Cache Utilities

**File**: `src/lib/utils/cache.ts`

```typescript
import type { Duration, Timestamp, Maybe } from "../types/common";

// Basic cache interface
export interface Cache<K, V> {
  get(key: K): Promise<Maybe<V>>;
  set(key: K, value: V, ttl?: Duration): Promise<void>;
  delete(key: K): Promise<boolean>;
  clear(): Promise<void>;
  has(key: K): Promise<boolean>;
  size(): Promise<number>;
}

// Cache entry with metadata
export type CacheEntry<V> = {
  value: V;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  accessCount: number;
  lastAccessed: Timestamp;
};

// In-memory cache implementation
export class MemoryCache<K, V> implements Cache<K, V> {
  private storage = new Map<K, CacheEntry<V>>();
  private readonly defaultTTL: Duration;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    options: { defaultTTL?: Duration; cleanupInterval?: Duration } = {},
  ) {
    this.defaultTTL = options.defaultTTL ?? 60000; // 1 minute

    if (options.cleanupInterval) {
      this.cleanupInterval = setInterval(
        () => this.cleanup(),
        options.cleanupInterval,
      );
    }
  }

  async get(key: K): Promise<Maybe<V>> {
    const entry = this.storage.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.storage.delete(key);
      return undefined;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.value;
  }

  async set(key: K, value: V, ttl = this.defaultTTL): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<V> = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessed: now,
    };

    this.storage.set(key, entry);
  }

  async delete(key: K): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async has(key: K): Promise<boolean> {
    const entry = this.storage.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt <= Date.now()) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  async size(): Promise<number> {
    this.cleanup();
    return this.storage.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.expiresAt <= now) {
        this.storage.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

// LRU Cache implementation
export class LRUCache<K, V> implements Cache<K, V> {
  private storage = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly defaultTTL: Duration;

  constructor(options: { maxSize: number; defaultTTL?: Duration }) {
    this.maxSize = options.maxSize;
    this.defaultTTL = options.defaultTTL ?? 60000;
  }

  async get(key: K): Promise<Maybe<V>> {
    const entry = this.storage.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.storage.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.storage.delete(key);
    entry.accessCount++;
    entry.lastAccessed = now;
    this.storage.set(key, entry);

    return entry.value;
  }

  async set(key: K, value: V, ttl = this.defaultTTL): Promise<void> {
    const now = Date.now();

    // Remove if already exists
    if (this.storage.has(key)) {
      this.storage.delete(key);
    } else if (this.storage.size >= this.maxSize) {
      // Remove least recently used
      const firstKey = this.storage.keys().next().value;
      this.storage.delete(firstKey);
    }

    const entry: CacheEntry<V> = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessed: now,
    };

    this.storage.set(key, entry);
  }

  async delete(key: K): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async has(key: K): Promise<boolean> {
    return this.storage.has(key);
  }

  async size(): Promise<number> {
    return this.storage.size;
  }
}

// Tiered cache (L1: Memory, L2: External)
export class TieredCache<K, V> implements Cache<K, V> {
  constructor(
    private l1Cache: Cache<K, V>,
    private l2Cache: Cache<K, V>,
  ) {}

  async get(key: K): Promise<Maybe<V>> {
    // Try L1 first
    let value = await this.l1Cache.get(key);
    if (value !== undefined) {
      return value;
    }

    // Try L2
    value = await this.l2Cache.get(key);
    if (value !== undefined) {
      // Promote to L1
      await this.l1Cache.set(key, value);
      return value;
    }

    return undefined;
  }

  async set(key: K, value: V, ttl?: Duration): Promise<void> {
    await Promise.all([
      this.l1Cache.set(key, value, ttl),
      this.l2Cache.set(key, value, ttl),
    ]);
  }

  async delete(key: K): Promise<boolean> {
    const [l1Result, l2Result] = await Promise.all([
      this.l1Cache.delete(key),
      this.l2Cache.delete(key),
    ]);
    return l1Result || l2Result;
  }

  async clear(): Promise<void> {
    await Promise.all([this.l1Cache.clear(), this.l2Cache.clear()]);
  }

  async has(key: K): Promise<boolean> {
    return (await this.l1Cache.has(key)) || (await this.l2Cache.has(key));
  }

  async size(): Promise<number> {
    // Return L2 size as it's more comprehensive
    return this.l2Cache.size();
  }
}

// Cache decorator for functions
export function memoize<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  options: {
    ttl?: Duration;
    maxSize?: number;
    keyGenerator?: (...args: Args) => string;
  } = {},
): (...args: Args) => Return {
  const cache = new LRUCache<string, Return>({
    maxSize: options.maxSize ?? 100,
    defaultTTL: options.ttl ?? 60000,
  });

  const keyGenerator =
    options.keyGenerator ?? ((...args: Args) => JSON.stringify(args));

  return (...args: Args): Return => {
    const key = keyGenerator(...args);

    // For sync functions, we need to handle the async cache differently
    let cached: Return | undefined;
    cache.get(key).then((value) => {
      cached = value;
    });

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Async memoization
export function memoizeAsync<Args extends unknown[], Return>(
  fn: (...args: Args) => Promise<Return>,
  options: {
    ttl?: Duration;
    maxSize?: number;
    keyGenerator?: (...args: Args) => string;
  } = {},
): (...args: Args) => Promise<Return> {
  const cache = new LRUCache<string, Return>({
    maxSize: options.maxSize ?? 100,
    defaultTTL: options.ttl ?? 60000,
  });

  const keyGenerator =
    options.keyGenerator ?? ((...args: Args) => JSON.stringify(args));

  return async (...args: Args): Promise<Return> => {
    const key = keyGenerator(...args);

    const cached = await cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn(...args);
    await cache.set(key, result);
    return result;
  };
}
```

### Step 4: Create Enhanced Logger

**File**: `src/lib/utils/logger.ts`

```typescript
import type {
  LogLevel,
  Timestamp,
  UnknownRecord,
  ErrorInfo,
  Environment,
} from "../types/common";

// Log entry structure
export type LogEntry = {
  timestamp: Timestamp;
  level: LogLevel;
  message: string;
  category?: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: UnknownRecord;
  error?: ErrorInfo;
  stack?: string;
};

// Logger configuration
export type LoggerConfig = {
  level: LogLevel;
  format: "json" | "text";
  includeTimestamp: boolean;
  includeStack: boolean;
  colorize: boolean;
  maxMessageLength: number;
  sensitiveFields: string[];
  environment: Environment;
};

// Log transport interface
export interface LogTransport {
  log(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

// Console transport
export class ConsoleTransport implements LogTransport {
  constructor(private config: Partial<LoggerConfig> = {}) {}

  async log(entry: LogEntry): Promise<void> {
    const formatted = this.formatEntry(entry);

    switch (entry.level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
      case "fatal":
        console.error(formatted);
        break;
    }
  }

  private formatEntry(entry: LogEntry): string {
    if (this.config.format === "json") {
      return JSON.stringify(this.sanitizeEntry(entry));
    }

    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const component = entry.component ? `[${entry.component}]` : "";
    const category = entry.category ? `(${entry.category})` : "";

    let message = `${timestamp} ${level} ${component}${category} ${entry.message}`;

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` ${JSON.stringify(entry.metadata)}`;
    }

    if (entry.error) {
      message += `\nError: ${entry.error.message}`;
      if (entry.stack && this.config.includeStack) {
        message += `\nStack: ${entry.stack}`;
      }
    }

    return message;
  }

  private sanitizeEntry(entry: LogEntry): LogEntry {
    const sanitized = { ...entry };

    // Remove sensitive fields
    if (this.config.sensitiveFields && sanitized.metadata) {
      const metadata = { ...sanitized.metadata };
      for (const field of this.config.sensitiveFields) {
        if (field in metadata) {
          metadata[field] = "[REDACTED]";
        }
      }
      sanitized.metadata = metadata;
    }

    return sanitized;
  }
}

// File transport
export class FileTransport implements LogTransport {
  private writeStream?: any; // fs.WriteStream type would be here

  constructor(
    private filePath: string,
    private config: Partial<LoggerConfig> = {},
  ) {}

  async log(entry: LogEntry): Promise<void> {
    if (!this.writeStream) {
      await this.initializeStream();
    }

    const formatted = JSON.stringify(entry) + "\n";
    this.writeStream.write(formatted);
  }

  private async initializeStream(): Promise<void> {
    // In a real implementation, this would create a file write stream
    // const fs = await import("fs");
    // this.writeStream = fs.createWriteStream(this.filePath, { flags: "a" });
  }

  async flush(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve) => {
        this.writeStream.end(resolve);
      });
    }
  }

  async close(): Promise<void> {
    await this.flush();
  }
}

// Enhanced logger class
export class Logger {
  private transports: LogTransport[] = [];
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimeout?: NodeJS.Timeout;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: "info",
      format: "text",
      includeTimestamp: true,
      includeStack: true,
      colorize: false,
      maxMessageLength: 10000,
      sensitiveFields: ["password", "apiKey", "token", "secret"],
      environment: "development",
      ...config,
    };

    // Default console transport
    this.addTransport(new ConsoleTransport(this.config));
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index > -1) {
      this.transports.splice(index, 1);
    }
  }

  debug(message: string, metadata?: UnknownRecord): void {
    this.log("debug", message, metadata);
  }

  info(message: string, metadata?: UnknownRecord): void {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: UnknownRecord): void {
    this.log("warn", message, metadata);
  }

  error(
    message: string,
    error?: Error | ErrorInfo,
    metadata?: UnknownRecord,
  ): void {
    const errorInfo =
      error instanceof Error
        ? {
            message: error.message,
            code: "UNKNOWN_ERROR",
            stack: error.stack,
          }
        : error;

    this.log("error", message, metadata, errorInfo);
  }

  fatal(
    message: string,
    error?: Error | ErrorInfo,
    metadata?: UnknownRecord,
  ): void {
    const errorInfo =
      error instanceof Error
        ? {
            message: error.message,
            code: "FATAL_ERROR",
            stack: error.stack,
          }
        : error;

    this.log("fatal", message, metadata, errorInfo);
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: UnknownRecord,
    error?: ErrorInfo,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: this.truncateMessage(message),
      metadata,
      error,
      stack:
        error?.stack ||
        (this.config.includeStack ? new Error().stack : undefined),
    };

    this.writeEntry(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error", "fatal"];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= configLevelIndex;
  }

  private truncateMessage(message: string): string {
    if (message.length <= this.config.maxMessageLength) {
      return message;
    }
    return (
      message.substring(0, this.config.maxMessageLength) + "... [truncated]"
    );
  }

  private async writeEntry(entry: LogEntry): Promise<void> {
    for (const transport of this.transports) {
      try {
        await transport.log(entry);
      } catch (error) {
        // Don't log errors from logging - could cause infinite loop
        console.error("Failed to write log entry:", error);
      }
    }
  }

  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map((transport) =>
        transport.flush ? transport.flush() : Promise.resolve(),
      ),
    );
  }

  async close(): Promise<void> {
    await this.flush();
    await Promise.all(
      this.transports.map((transport) =>
        transport.close ? transport.close() : Promise.resolve(),
      ),
    );
  }

  // Create child logger with additional context
  child(
    context: Partial<
      Pick<LogEntry, "component" | "category" | "userId" | "sessionId">
    >,
  ): Logger {
    const childLogger = new Logger(this.config);
    childLogger.transports = this.transports; // Share transports

    // Override log method to include context
    const originalLog = childLogger.log;
    childLogger.log = (
      level: LogLevel,
      message: string,
      metadata?: UnknownRecord,
      error?: ErrorInfo,
    ) => {
      const extendedMetadata = { ...metadata, ...context };
      originalLog.call(childLogger, level, message, extendedMetadata, error);
    };

    return childLogger;
  }
}

// Global logger instance
export const logger = new Logger();

// Convenience functions
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

export function setLogLevel(level: LogLevel): void {
  logger.config.level = level;
}
```

## Validation Checklist

### Type Safety Checks

- [ ] All utility functions properly typed
- [ ] Async utilities handle errors correctly
- [ ] Cache implementations type-safe
- [ ] Logger system properly typed
- [ ] No `any` types in utilities

### Functionality Checks

- [ ] Retry logic works correctly
- [ ] Circuit breaker functions properly
- [ ] Cache stores and retrieves correctly
- [ ] Logger outputs to all transports
- [ ] Rate limiting works as expected

### Integration Checks

- [ ] Core module uses new utilities
- [ ] Providers use retry and cache utilities
- [ ] Configuration system uses validation
- [ ] Error handling uses logger

## Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit src/lib/utils/*.ts

# Test utilities
pnpm test test/utils/

# Test async utilities
node -e "
const { withRetry, delay } = require('./dist/lib/utils/async.js');
withRetry(() => Promise.resolve('test')).then(console.log);
"

# Test cache
node -e "
const { MemoryCache } = require('./dist/lib/utils/cache.js');
const cache = new MemoryCache();
cache.set('key', 'value').then(() => cache.get('key')).then(console.log);
"

# Test logger
node -e "
const { logger } = require('./dist/lib/utils/logger.js');
logger.info('Test message', { test: true });
"
```

## Success Criteria

- ✅ All utility functions properly typed
- ✅ Async utilities comprehensive and reliable
- ✅ Cache implementations efficient and type-safe
- ✅ Logger system flexible and performant
- ✅ No `any` types in utility modules
- ✅ Integration with all modules works
- ✅ All utility tests pass

## Next Steps

After completing this refactor:

1. Update core module to use new utilities
2. Update providers to use retry and cache
3. Update CLI to use enhanced logger
4. Update configuration to use validation utilities

## Impact Assessment

**High Impact**:

- Utilities become type-safe and reliable
- Error handling improves across codebase
- Performance improvements from caching

**Medium Impact**:

- Code reuse increases
- Debugging improves with better logging
- Resilience improves with retry logic

**Low Impact**:

- Bundle size (utilities are tree-shakeable)
- Migration effort (mostly additive changes)
