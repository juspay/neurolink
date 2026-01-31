# Streaming with Retry Logic

## Problem

Network interruptions, temporary provider outages, and transient errors can cause streaming responses to fail mid-stream. Without retry logic, users experience incomplete responses and poor reliability.

## Solution

Implement automatic retry with exponential backoff for streaming responses. Handle different failure scenarios:

- Network timeouts
- Connection drops
- Provider rate limits
- Transient API errors

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

type RetryConfig = {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
};

async function streamWithRetry(
  neurolink: NeuroLink,
  prompt: string,
  config: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
) {
  let attempt = 0;
  let delay = config.initialDelay;

  while (attempt <= config.maxRetries) {
    try {
      const stream = await neurolink.stream({
        input: { text: prompt },
        provider: "openai",
        model: "gpt-4",
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        if (chunk.type === "content-delta") {
          fullResponse += chunk.delta;
          process.stdout.write(chunk.delta);
        }
      }

      console.log("\n✅ Stream completed successfully");
      return fullResponse;
    } catch (error: any) {
      attempt++;

      // Check if error is retryable
      const isRetryable =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.status === 429 || // Rate limit
        error.status === 503 || // Service unavailable
        error.status === 502; // Bad gateway

      if (!isRetryable || attempt > config.maxRetries) {
        console.error(
          `❌ Stream failed after ${attempt} attempts:`,
          error.message,
        );
        throw error;
      }

      console.log(
        `⚠️  Stream interrupted (attempt ${attempt}/${config.maxRetries}). Retrying in ${delay}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }
}

// Usage example
async function main() {
  const neurolink = new NeuroLink();

  try {
    const response = await streamWithRetry(
      neurolink,
      "Write a detailed explanation of quantum computing",
      {
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 8000,
        backoffMultiplier: 2,
      },
    );

    console.log("Final response length:", response.length);
  } catch (error) {
    console.error("Failed after all retries:", error);
  }
}

main();
```

## Explanation

### 1. Retry Configuration

The `RetryConfig` interface defines retry behavior:

- `maxRetries`: Maximum number of retry attempts
- `initialDelay`: Starting delay between retries (milliseconds)
- `maxDelay`: Maximum delay to prevent excessive waiting
- `backoffMultiplier`: How quickly delays increase (exponential backoff)

### 2. Retry Loop

The while loop attempts streaming up to `maxRetries + 1` times (initial attempt + retries).

### 3. Error Classification

Not all errors should trigger retries:

- **Retryable**: Network errors, rate limits, temporary service issues
- **Non-retryable**: Authentication errors, invalid requests, missing models

### 4. Exponential Backoff

Each retry waits longer than the previous:

- First retry: 1000ms
- Second retry: 2000ms
- Third retry: 4000ms
- Fourth retry: 8000ms (capped at maxDelay)

This prevents overwhelming the provider and gives transient issues time to resolve.

### 5. Stream Consumption

The code accumulates chunks to provide a complete response even if earlier attempts partially succeeded.

## Variations

### Resume from Last Position

For very long streams, resume from the last received position:

```typescript
async function streamWithResume(
  neurolink: NeuroLink,
  prompt: string,
  onProgress?: (text: string) => void,
) {
  let accumulated = "";
  let attempt = 0;
  const maxRetries = 3;

  while (attempt <= maxRetries) {
    try {
      // Resume prompt includes what we already have
      const resumePrompt = accumulated
        ? `${prompt}\n\nContinue from: "${accumulated.slice(-100)}"`
        : prompt;

      const stream = await neurolink.stream({
        input: { text: resumePrompt },
        provider: "openai",
      });

      for await (const chunk of stream) {
        if (chunk.type === "content-delta") {
          accumulated += chunk.delta;
          onProgress?.(chunk.delta);
        }
      }

      return accumulated;
    } catch (error: any) {
      attempt++;
      if (attempt > maxRetries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}
```

### Circuit Breaker Pattern

Prevent repeated failures with a circuit breaker:

```typescript
class StreamCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  async executeStream(fn: () => Promise<any>) {
    // Check if circuit is open
    if (this.failures >= this.threshold) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure < this.resetTimeout) {
        throw new Error("Circuit breaker is open. Too many recent failures.");
      }
      // Reset after timeout
      this.failures = 0;
    }

    try {
      const result = await fn();
      this.failures = 0; // Reset on success
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      throw error;
    }
  }
}

// Usage
const breaker = new StreamCircuitBreaker();
const result = await breaker.executeStream(() =>
  neurolink.stream({ input: { text: prompt } }),
);
```

### Provider Fallback on Retry

Try different providers on subsequent retries:

```typescript
const providers = ["openai", "anthropic", "google-ai"] as const;

async function streamWithProviderFallback(prompt: string) {
  for (const provider of providers) {
    try {
      console.log(`Trying provider: ${provider}`);
      const stream = await neurolink.stream({
        input: { text: prompt },
        provider,
      });

      let response = "";
      for await (const chunk of stream) {
        if (chunk.type === "content-delta") {
          response += chunk.delta;
        }
      }

      console.log(`✅ Success with ${provider}`);
      return response;
    } catch (error) {
      console.log(`❌ ${provider} failed, trying next...`);
      continue;
    }
  }

  throw new Error("All providers failed");
}
```

## See Also

- [Error Recovery Patterns](error-recovery.md)
- [Multi-Provider Fallback](multi-provider-fallback.md)
- [Rate Limit Handling](rate-limit-handling.md)
- [Streaming API Reference](../sdk/api-reference.md#core-methods)
