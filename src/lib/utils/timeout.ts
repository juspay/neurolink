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
    anthropic: "30s", // Direct Anthropic API is fast
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

// Re-export createTimeoutController from timeout-wrapper for convenience
export { createTimeoutController } from "../providers/timeout-wrapper.js";
