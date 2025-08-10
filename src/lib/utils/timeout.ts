/**
 * Timeout utilities for NeuroLink
 *
 * Provides flexible timeout parsing and error handling for AI operations.
 * Supports multiple time formats: milliseconds, seconds, minutes, hours.
 */

/**
 * Custom error class for timeout operations
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number,
    public readonly provider?: string,
    public readonly operation?: "generate" | "stream",
  ) {
    super(message);
    this.name = "TimeoutError";
    // Maintains proper stack trace for where error was thrown
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Parse timeout value from various formats
 * @param timeout - Can be number (ms), string with unit, or undefined
 * @returns Parsed timeout in milliseconds or undefined
 * @throws Error if format is invalid
 *
 * Examples:
 * - parseTimeout(5000) => 5000
 * - parseTimeout('30s') => 30000
 * - parseTimeout('2m') => 120000
 * - parseTimeout('1.5h') => 5400000
 * - parseTimeout(undefined) => undefined
 */
export function parseTimeout(
  timeout: number | string | undefined,
): number | undefined {
  if (timeout === undefined) {
    return undefined;
  }

  if (typeof timeout === "number") {
    if (timeout <= 0) {
      throw new Error(`Timeout must be positive, got: ${timeout}`);
    }
    return timeout; // Assume milliseconds
  }

  if (typeof timeout === "string") {
    // Match number (including decimals) followed by optional unit
    const match = timeout.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
    if (!match) {
      throw new Error(
        `Invalid timeout format: ${timeout}. Use formats like '30s', '2m', '500ms', or '1.5h'`,
      );
    }

    const value = parseFloat(match[1]);
    if (value <= 0) {
      throw new Error(`Timeout must be positive, got: ${value}`);
    }

    const unit = match[2] || "ms";

    switch (unit) {
      case "ms":
        return value;
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      default:
        return value; // Should never reach here due to regex
    }
  }

  throw new Error(`Invalid timeout type: ${typeof timeout}`);
}

/**
 * Default timeout configurations for different providers and operations
 */
export const DEFAULT_TIMEOUTS = {
  global: "30s", // Default for all providers
  streaming: "2m", // Longer timeout for streaming operations
  providers: {
    openai: "30s", // OpenAI typically responds quickly
    bedrock: "45s", // AWS can be slower, especially for cold starts
    vertex: "60s", // Google Cloud can be slower
    anthropic: "60s", // Increased timeout for Anthropic API stability
    azure: "30s", // Azure OpenAI similar to OpenAI
    "google-ai": "30s", // Google AI Studio is fast
    huggingface: "2m", // Open source models vary significantly
    ollama: "5m", // Local models need more time, especially large ones
    mistral: "45s", // Mistral AI moderate speed
  },
  tools: {
    default: "10s", // Default timeout for MCP tool execution
    filesystem: "5s", // File operations should be quick
    network: "30s", // Network requests might take longer
    computation: "2m", // Heavy computation tools need more time
  },
};

/**
 * Get default timeout for a specific provider
 * @param provider - Provider name
 * @param operation - Operation type (generate or stream)
 * @returns Default timeout string
 */
export function getDefaultTimeout(
  provider: string,
  operation: "generate" | "stream" = "generate",
): string {
  if (operation === "stream") {
    return DEFAULT_TIMEOUTS.streaming;
  }

  const providerKey = provider.toLowerCase().replace("_", "-");
  return (
    DEFAULT_TIMEOUTS.providers[
      providerKey as keyof typeof DEFAULT_TIMEOUTS.providers
    ] || DEFAULT_TIMEOUTS.global
  );
}

/**
 * Create a timeout promise that rejects after specified duration
 * @param timeout - Timeout duration
 * @param provider - Provider name for error message
 * @param operation - Operation type for error message
 * @returns Promise that rejects with TimeoutError
 */
export function createTimeoutPromise(
  timeout: number | string | undefined,
  provider: string,
  operation: "generate" | "stream",
): Promise<never> | null {
  const timeoutMs = parseTimeout(timeout);

  if (!timeoutMs) {
    return null; // No timeout
  }

  return new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(
        new TimeoutError(
          `${provider} ${operation} operation timed out after ${timeout}`,
          timeoutMs,
          provider,
          operation,
        ),
      );
    }, timeoutMs);

    // Unref the timer so it doesn't keep the process alive (Node.js only)
    if (
      typeof timer === "object" &&
      timer &&
      "unref" in timer &&
      typeof timer.unref === "function"
    ) {
      (timer as NodeJS.Timeout).unref();
    }
  });
}

// Consolidated timeout utilities - interfaces from timeout-manager.ts
export interface TimeoutConfig {
  operation: string;
  timeout?: number | string;
  gracefulShutdown?: boolean;
  retryOnTimeout?: boolean;
  maxRetries?: number;
  abortSignal?: AbortSignal;
}

export interface TimeoutResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  timedOut: boolean;
  executionTime: number;
  retriesUsed: number;
}

/**
 * Enhanced timeout manager with proper cleanup and abort controller integration
 * Consolidated from timeout-manager.ts
 */
export class TimeoutManager {
  private activeTimeouts: Map<
    string,
    {
      timer: NodeJS.Timeout;
      controller: AbortController;
      cleanup: () => void;
    }
  > = new Map();

  /**
   * Execute operation with timeout and proper cleanup
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig,
  ): Promise<TimeoutResult<T>> {
    const startTime = Date.now();
    const operationId = this.generateOperationId(config.operation);
    let retriesUsed = 0;
    const maxRetries = config.retryOnTimeout ? (config.maxRetries ?? 1) : 0;

    while (retriesUsed <= maxRetries) {
      try {
        const result = await this.performSingleOperation(
          operation,
          config,
          operationId,
        );

        return {
          success: true,
          data: result,
          timedOut: false,
          executionTime: Date.now() - startTime,
          retriesUsed,
        };
      } catch (error) {
        this.cleanup(operationId);

        if (error instanceof TimeoutError && retriesUsed < maxRetries) {
          retriesUsed++;
          continue;
        }

        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          timedOut: error instanceof TimeoutError,
          executionTime: Date.now() - startTime,
          retriesUsed,
        };
      }
    }

    return {
      success: false,
      error: new Error("Maximum retries exceeded"),
      timedOut: true,
      executionTime: Date.now() - startTime,
      retriesUsed,
    };
  }

  private async performSingleOperation<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig,
    operationId: string,
  ): Promise<T> {
    const timeoutMs = this.getTimeoutMs(config);

    if (!timeoutMs) {
      return await operation();
    }

    const controller = new AbortController();
    const existingSignal = config.abortSignal;

    if (existingSignal) {
      existingSignal.addEventListener("abort", () => {
        controller.abort(existingSignal.reason);
      });

      if (existingSignal.aborted) {
        throw new Error("Operation aborted before execution");
      }
    }

    const timeoutPromise = this.createTimeoutPromise(timeoutMs, operationId);
    this.registerTimeout(operationId, timeoutPromise.timer, controller, () => {
      clearTimeout(timeoutPromise.timer);
    });

    try {
      return await Promise.race([operation(), timeoutPromise.promise]);
    } finally {
      this.cleanup(operationId);
    }
  }

  private getTimeoutMs(config: TimeoutConfig): number | undefined {
    return parseTimeout(config.timeout);
  }

  private generateOperationId(operation: string): string {
    return `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createTimeoutPromise(timeoutMs: number, operationId: string) {
    let timer: NodeJS.Timeout;
    const promise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new TimeoutError(`Operation timeout after ${timeoutMs}ms`, timeoutMs),
        );
      }, timeoutMs);
    });
    return { promise, timer: timer! };
  }

  private registerTimeout(
    operationId: string,
    timer: NodeJS.Timeout,
    controller: AbortController,
    cleanup: () => void,
  ): void {
    this.activeTimeouts.set(operationId, { timer, controller, cleanup });
  }

  cleanup(operationId: string): void {
    const timeoutInfo = this.activeTimeouts.get(operationId);
    if (timeoutInfo) {
      timeoutInfo.cleanup();
      this.activeTimeouts.delete(operationId);
    }
  }

  gracefulShutdown(): void {
    for (const [operationId] of this.activeTimeouts) {
      this.cleanup(operationId);
    }
  }
}

/**
 * Wrapper functions consolidated from timeout-wrapper.ts
 */

/**
 * Wrap a promise with timeout
 * @param promise - The promise to wrap
 * @param timeout - Timeout duration (number in ms or string with unit)
 * @param provider - Provider name for error messages
 * @param operation - Operation type (generate or stream)
 * @returns The result of the promise or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number | string | undefined,
  provider: string,
  operation: "generate" | "stream",
): Promise<T> {
  const timeoutMs = parseTimeout(timeout);

  if (!timeoutMs) {
    return promise;
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new TimeoutError(
          `${provider} ${operation} operation timed out after ${timeoutMs}ms`,
          timeoutMs,
          provider,
          operation,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Wrap a streaming async generator with timeout
 * @param generator - The async generator to wrap
 * @param timeout - Timeout duration for the entire stream
 * @param provider - Provider name for error messages
 * @returns Wrapped async generator that respects timeout
 */
export async function* withStreamingTimeout<T>(
  generator: AsyncGenerator<T>,
  timeout: number | string | undefined,
  provider: string,
): AsyncGenerator<T> {
  const timeoutMs = parseTimeout(timeout);

  if (!timeoutMs) {
    yield* generator;
    return;
  }

  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new TimeoutError(
          `${provider} streaming operation timed out after ${timeoutMs}ms`,
          timeoutMs,
          provider,
          "stream",
        ),
      );
    }, timeoutMs);
  });

  try {
    for await (const item of generator) {
      const raceResult = await Promise.race([
        Promise.resolve(item),
        timeoutPromise,
      ]);
      yield raceResult;
    }
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Create an abort controller with timeout
 * @param timeout - Timeout duration
 * @param provider - Provider name for error messages
 * @param operation - Operation type
 * @returns AbortController and cleanup function
 */
export function createTimeoutController(
  timeout: number | string | undefined,
  provider: string,
  operation: "generate" | "stream",
): {
  controller: AbortController;
  cleanup: () => void;
  timeoutMs: number;
} | null {
  const timeoutMs = parseTimeout(timeout);

  if (!timeoutMs) {
    return null;
  }

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort(
      new TimeoutError(
        `${provider} ${operation} operation timed out after ${timeout}`,
        timeoutMs,
        provider,
        operation,
      ),
    );
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timer);
  };

  return { controller, cleanup, timeoutMs };
}

/**
 * Merge abort signals (for combining user abort with timeout)
 * @param signals - Array of abort signals to merge
 * @returns Combined abort controller
 */
export function mergeAbortSignals(
  signals: (AbortSignal | undefined)[],
): AbortController {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal && !signal.aborted) {
      signal.addEventListener("abort", () => {
        if (!controller.signal.aborted) {
          controller.abort(signal.reason);
        }
      });
    }

    if (signal?.aborted) {
      controller.abort(signal.reason);
      break;
    }
  }

  return controller;
}
