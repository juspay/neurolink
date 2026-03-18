# Error Recovery Patterns

## Problem

Production AI applications face various errors:

- Network failures
- Provider outages
- Invalid API keys
- Model unavailability
- Timeout errors
- Rate limiting
- Malformed responses

Without proper error handling, applications crash or produce poor user experiences.

## Solution

Implement comprehensive error recovery with:

1. Error classification (retryable vs fatal)
2. Graceful degradation
3. User-friendly error messages
4. Automatic fallback strategies
5. Error monitoring and alerting

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

enum ErrorType {
  RETRYABLE,
  FALLBACK,
  FATAL,
}

type ErrorRecoveryConfig = {
  maxRetries?: number;
  fallbackProvider?: string;
  fallbackResponse?: string;
  onError?: (error: Error, context: any) => void;
};

class RobustNeuroLink {
  private neurolink: NeuroLink;
  private config: ErrorRecoveryConfig;

  constructor(config: ErrorRecoveryConfig = {}) {
    this.neurolink = new NeuroLink();
    this.config = {
      maxRetries: config.maxRetries || 3,
      fallbackProvider: config.fallbackProvider,
      fallbackResponse:
        config.fallbackResponse ||
        "I'm having trouble processing your request. Please try again.",
      onError: config.onError,
    };
  }

  /**
   * Classify error to determine recovery strategy
   */
  private classifyError(error: any): ErrorType {
    // Network errors - retryable
    if (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.message?.includes("network") ||
      error.message?.includes("timeout")
    ) {
      return ErrorType.RETRYABLE;
    }

    // Provider errors - may fallback
    if (
      error.status === 429 || // Rate limit
      error.status === 503 || // Service unavailable
      error.status === 502 || // Bad gateway
      error.status === 504 || // Gateway timeout
      error.message?.includes("overloaded") ||
      error.message?.includes("capacity")
    ) {
      return ErrorType.FALLBACK;
    }

    // Authentication errors - fatal
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.message?.includes("API key") ||
      error.message?.includes("authentication")
    ) {
      return ErrorType.FATAL;
    }

    // Invalid request - fatal
    if (
      error.status === 400 ||
      error.message?.includes("invalid") ||
      error.message?.includes("malformed")
    ) {
      return ErrorType.FATAL;
    }

    // Default: retryable
    return ErrorType.RETRYABLE;
  }

  /**
   * Get user-friendly error message
   */
  private getUserMessage(error: any): string {
    const messages: Record<number, string> = {
      401: "Authentication failed. Please check your API key.",
      403: "Access denied. You may not have permission for this operation.",
      429: "Rate limit exceeded. Please wait a moment and try again.",
      500: "The AI service encountered an error. Please try again.",
      503: "The AI service is temporarily unavailable. Please try again later.",
    };

    return (
      messages[error.status] || error.message || "An unexpected error occurred."
    );
  }

  /**
   * Generate with automatic error recovery
   */
  async generateSafe(
    prompt: string,
    options: {
      provider?: string;
      model?: string;
      fallbackProvider?: string;
    } = {},
  ): Promise<{ content: string; error?: Error; recovered: boolean }> {
    const provider = options.provider || "openai";
    let attempt = 0;

    while (attempt < this.config.maxRetries!) {
      try {
        const result = await this.neurolink.generate({
          input: { text: prompt },
          provider,
          model: options.model,
        });

        return {
          content: result.content,
          recovered: attempt > 0,
        };
      } catch (error: any) {
        attempt++;
        const errorType = this.classifyError(error);

        // Log error
        console.error(
          `❌ Error (attempt ${attempt}/${this.config.maxRetries}):`,
          error.message,
        );
        this.config.onError?.(error, { prompt, provider, attempt });

        // Fatal errors - don't retry
        if (errorType === ErrorType.FATAL) {
          return {
            content: this.config.fallbackResponse!,
            error: new Error(this.getUserMessage(error)),
            recovered: false,
          };
        }

        // Fallback to alternative provider
        if (errorType === ErrorType.FALLBACK && options.fallbackProvider) {
          try {
            console.log(
              `🔄 Trying fallback provider: ${options.fallbackProvider}`,
            );

            const fallbackResult = await this.neurolink.generate({
              input: { text: prompt },
              provider: options.fallbackProvider,
            });

            return {
              content: fallbackResult.content,
              recovered: true,
            };
          } catch (fallbackError: any) {
            console.error("❌ Fallback also failed:", fallbackError.message);
          }
        }

        // Retryable errors - wait and retry
        if (attempt < this.config.maxRetries!) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // All retries exhausted
    return {
      content: this.config.fallbackResponse!,
      error: new Error("All retry attempts failed"),
      recovered: false,
    };
  }

  /**
   * Stream with error recovery
   */
  async streamSafe(
    prompt: string,
    options: { provider?: string } = {},
  ): Promise<AsyncIterable<string>> {
    const provider = options.provider || "openai";

    try {
      const result = await this.neurolink.stream({
        input: { text: prompt },
        provider,
      });

      // Wrap stream to handle errors
      return this.wrapStreamWithRecovery(result.stream, prompt, provider);
    } catch (error: any) {
      console.error("❌ Stream failed:", error.message);

      // Return fallback as async iterable
      return (async function* () {
        yield "I'm having trouble streaming the response. ";
        yield "Please try again or rephrase your request.";
      })();
    }
  }

  /**
   * Wrap stream with error recovery
   */
  private async *wrapStreamWithRecovery(
    stream: AsyncIterable<any>,
    prompt: string,
    provider: string,
  ): AsyncIterable<string> {
    try {
      for await (const chunk of stream) {
        if ("content" in chunk) yield chunk.content;
      }
    } catch (error: any) {
      console.error("❌ Stream interrupted:", error.message);

      // Try to recover with non-streaming
      try {
        const fallback = await this.generateSafe(prompt, { provider });
        yield "\n\n[Recovered via non-streaming]\n";
        yield fallback.content;
      } catch {
        yield "\n\n[Stream failed and recovery failed]";
      }
    }
  }
}

// Usage Example
async function main() {
  const robust = new RobustNeuroLink({
    maxRetries: 3,
    fallbackProvider: "anthropic",
    onError: (error, context) => {
      // Log to monitoring service
      console.error("Error logged:", {
        error: error.message,
        context,
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Generate with automatic recovery
  const result = await robust.generateSafe("Explain quantum computing", {
    provider: "openai",
    fallbackProvider: "anthropic",
  });

  if (result.error) {
    console.log("⚠️  Recovered from error:", result.error.message);
  }

  console.log("Response:", result.content);

  // Stream with error recovery
  console.log("\nStreaming...");
  const stream = await robust.streamSafe("Tell me a story");

  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
}

main();
```

## Explanation

### 1. Error Classification

Errors fall into three categories:

**Retryable**: Temporary issues that may resolve

- Network timeouts
- Connection resets
- Temporary service issues

**Fallback**: Use alternative provider

- Rate limits
- Service overload
- Provider outages

**Fatal**: Don't retry

- Invalid API keys
- Malformed requests
- Unauthorized access

### 2. Retry Strategy

- **Exponential backoff**: 1s, 2s, 4s, 8s (max 10s)
- **Max retries**: 3 attempts by default
- **Smart delays**: Longer delays for repeated failures

### 3. Graceful Degradation

When all else fails:

- Return fallback response
- Log error for monitoring
- Preserve application stability

### 4. User-Friendly Messages

Map technical errors to user-friendly messages:

```
401 → "Authentication failed. Please check your API key."
503 → "Service temporarily unavailable. Please try again later."
```

### 5. Error Monitoring

Call `onError` callback for:

- Logging to monitoring service
- Alerting on critical errors
- Analytics and debugging

## Variations

### Circuit Breaker

Prevent cascading failures:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailure > 60000) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= 5) {
      this.state = "OPEN";
      console.log("🚨 Circuit breaker OPEN");
    }
  }

  private reset() {
    this.failures = 0;
    this.state = "CLOSED";
  }
}
```

### Health Checks

Monitor provider health:

```typescript
class ProviderHealthMonitor {
  private health = new Map<string, boolean>();

  async checkHealth(provider: string): Promise<boolean> {
    try {
      await neurolink.generate({
        input: { text: "test" },
        provider,
        maxTokens: 10,
      });

      this.health.set(provider, true);
      return true;
    } catch {
      this.health.set(provider, false);
      return false;
    }
  }

  isHealthy(provider: string): boolean {
    return this.health.get(provider) ?? true;
  }
}
```

### Automatic Provider Selection

Choose healthy provider automatically:

```typescript
async function selectHealthyProvider(providers: string[]): Promise<string> {
  for (const provider of providers) {
    const healthy = await healthMonitor.checkHealth(provider);
    if (healthy) return provider;
  }

  throw new Error("No healthy providers available");
}
```

## Best Practices

1. **Log all errors**: Track patterns for debugging
2. **Monitor error rates**: Alert on unusual spikes
3. **Test error paths**: Simulate failures in testing
4. **Provide context**: Include request details in errors
5. **User communication**: Clear, actionable error messages

## See Also

- [Streaming with Retry](streaming-with-retry.md)
- [Multi-Provider Fallback](multi-provider-fallback.md)
- [Rate Limit Handling](rate-limit-handling.md)
- [Troubleshooting Guide](../guides/troubleshooting.md)
