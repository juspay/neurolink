/**
 * Test utility functions for common test patterns
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown, result?: unknown) => boolean;
}

/**
 * Generic retry utility for test operations
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  logger?: { warn: (message: string) => void },
): Promise<T> {
  const { maxAttempts = 3, delayMs = 2000, shouldRetry = () => true } = options;

  let attempts = 0;
  let lastError: unknown;

  while (attempts < maxAttempts) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      attempts++;

      if (attempts >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      if (logger) {
        logger.warn(
          `🔄 Attempt ${attempts}/${maxAttempts} failed, retrying in ${delayMs}ms...`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Retry utility specifically for CLI operations
 */
export async function retryCLI(
  operation: () => Promise<{ stdout: string; stderr?: string }>,
  options: RetryOptions = {},
  logger?: { warn: (message: string) => void },
): Promise<{ stdout: string; stderr?: string }> {
  const cliShouldRetry = (error: unknown, result?: unknown) => {
    // Retry if there's an error or if stdout is empty/contains errors
    if (error) {
      return true;
    }
    if (
      result &&
      typeof result === "object" &&
      result !== null &&
      "stdout" in result
    ) {
      const stdout = (result as { stdout: string }).stdout;
      return stdout.includes("Error:") || stdout.trim() === "";
    }
    return true;
  };

  return retryAsync(
    operation,
    {
      ...options,
      shouldRetry: cliShouldRetry,
    },
    logger,
  );
}
