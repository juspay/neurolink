# Custom Middleware Development Guide

This document provides a comprehensive guide to developing and implementing custom middleware in the NeuroLink platform. Middleware offers a powerful way to enhance, modify, or extend the behavior of language models without changing their core implementation.

## Overview

Middleware in NeuroLink follows the interceptor pattern, allowing developers to intercept and modify the flow of data between the application and language models. This approach enables a clean separation of concerns and promotes modularity in your AI applications.

## Key Benefits

- **Separation of Concerns**: Keep core business logic separate from cross-cutting concerns
- **Reusability**: Create middleware components that can be reused across different parts of your application
- **Composability**: Chain multiple middleware components to build complex behaviors
- **Testability**: Test middleware components in isolation from the rest of your application
- **Extensibility**: Extend the functionality of language models without modifying their implementation

## Middleware Architecture

The middleware architecture in NeuroLink is based on the AI SDK's language model middleware specification. Middleware components can intercept and modify both the parameters sent to the language model and the responses received from it.

```mermaid
graph LR
    A[Application] --> B[Middleware 1]
    B --> C[Middleware 2]
    C --> D[Middleware 3]
    D --> E[Language Model]
    E --> D
    D --> C
    C --> B
    B --> A
```

## Implementing Custom Middleware

A middleware component in NeuroLink implements the `LanguageModelV1Middleware` interface, which provides three main methods for intercepting and modifying the language model's behavior:

1. `transformParams`: Transforms the parameters before they are passed to the language model
2. `wrapGenerate`: Wraps the `doGenerate` method of the language model
3. `wrapStream`: Wraps the `doStream` method of the language model

### Basic Middleware Template

Here's a basic template for creating a custom middleware component:

```typescript
import type { LanguageModelV1Middleware } from "ai";

export const yourCustomMiddleware: LanguageModelV1Middleware = {
  // Optional: Transform parameters before they are passed to the language model
  transformParams: async ({ params }) => {
    // Modify params as needed
    return {
      ...params,
      // Your modifications here
    };
  },

  // Optional: Wrap the doGenerate method
  wrapGenerate: async ({ doGenerate, params }) => {
    // Pre-processing logic
    console.log("Generate called with params:", params);

    // Call the original doGenerate method
    const result = await doGenerate();

    // Post-processing logic
    console.log("Generate result:", result);

    // Return the modified result
    return {
      ...result,
      // Your modifications here
    };
  },

  // Optional: Wrap the doStream method
  wrapStream: async ({ doStream, params }) => {
    // Pre-processing logic
    console.log("Stream called with params:", params);

    // Call the original doStream method
    const { stream, ...rest } = await doStream();

    // Create a transform stream to modify the chunks
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        // Modify the chunk as needed
        controller.enqueue(chunk);
      },
    });

    // Return the modified stream
    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};
```

### Using Your Custom Middleware

Once you've created your middleware, you can use it with the `wrapLanguageModel` function:

```typescript
import { wrapLanguageModel } from "ai";
import { yourCustomMiddleware } from "./middleware/your-custom-middleware";

const enhancedModel = wrapLanguageModel({
  model: yourOriginalModel,
  middleware: yourCustomMiddleware,
});

// Use the enhanced model just like any other language model
const result = await streamText({
  model: enhancedModel,
  prompt: "What is the capital of France?",
});
```

## Common Middleware Use Cases

Here are some common use cases for custom middleware in NeuroLink:

### Logging Middleware

Logging middleware can be used to log the parameters and results of language model calls, which is useful for debugging and monitoring:

```typescript
import type { LanguageModelV1Middleware } from "ai";

export const loggingMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    console.log(
      `[${new Date().toISOString()}] Generate called with prompt:`,
      typeof params.prompt === "string"
        ? params.prompt.substring(0, 100) + "..."
        : "Complex prompt",
    );

    const startTime = performance.now();
    const result = await doGenerate();
    const endTime = performance.now();

    console.log(
      `[${new Date().toISOString()}] Generate completed in ${endTime - startTime}ms`,
    );

    return result;
  },
};
```

### Caching Middleware

Caching middleware can be used to cache the results of language model calls, which can improve performance and reduce costs:

```typescript
import type { LanguageModelV1Middleware } from "ai";

// Simple in-memory cache
const cache = new Map<string, any>();

export const cachingMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    // Create a cache key from the parameters
    const cacheKey = JSON.stringify({
      prompt: params.prompt,
      temperature: params.settings?.temperature,
      maxOutputTokens: params.settings?.maxOutputTokens,
    });

    // Check if the result is in the cache
    if (cache.has(cacheKey)) {
      console.log("Cache hit!");
      return cache.get(cacheKey);
    }

    // Call the original doGenerate method
    const result = await doGenerate();

    // Store the result in the cache
    cache.set(cacheKey, result);

    return result;
  },
};
```

### Analytics Middleware

Analytics middleware can be used to collect metrics about language model usage:

```typescript
import type { LanguageModelV1Middleware } from "ai";

export const analyticsMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const startTime = performance.now();
    const result = await doGenerate();
    const endTime = performance.now();

    // Calculate input tokens (simplified example)
    const inputTokens =
      typeof params.prompt === "string" ? params.prompt.split(/\s+/).length : 0;

    // Calculate output tokens (simplified example)
    const outputTokens = result.text?.split(/\s+/).length || 0;

    // Record analytics
    const analytics = {
      responseTime: endTime - startTime,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      // Add any other metrics you want to track
    };

    // You could send these analytics to a monitoring system
    console.log("Analytics:", analytics);

    // Return the result with analytics attached
    return {
      ...result,
      analytics,
    };
  },
};
```

### Content Filtering Middleware

Content filtering middleware can be used to filter out inappropriate content from language model responses:

```typescript
import type { LanguageModelV1Middleware } from "ai";

export const contentFilteringMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate }) => {
    const { text, ...rest } = await doGenerate();

    // Define a list of inappropriate terms to filter
    const inappropriateTerms = ["badword1", "badword2", "badword3"];

    // Replace inappropriate terms with asterisks
    let filteredText = text;
    for (const term of inappropriateTerms) {
      const regex = new RegExp(term, "gi");
      filteredText = filteredText?.replace(regex, "*".repeat(term.length));
    }

    return { text: filteredText, ...rest };
  },
};
```

## Advanced Middleware Techniques

### Chaining Multiple Middlewares

You can chain multiple middlewares to create more complex behaviors:

```typescript
import { wrapLanguageModel } from "ai";
import { loggingMiddleware } from "./middleware/logging-middleware";
import { cachingMiddleware } from "./middleware/caching-middleware";
import { analyticsMiddleware } from "./middleware/analytics-middleware";
import { contentFilteringMiddleware } from "./middleware/content-filtering-middleware";

const enhancedModel = wrapLanguageModel({
  model: yourOriginalModel,
  middleware: [
    loggingMiddleware,
    cachingMiddleware,
    analyticsMiddleware,
    contentFilteringMiddleware,
  ],
});
```

The middlewares are applied in the order they are provided in the array. In this example, the flow would be:

1. `loggingMiddleware` logs the request
2. `cachingMiddleware` checks if the result is in the cache
3. `analyticsMiddleware` collects metrics
4. `contentFilteringMiddleware` filters the response
5. The response flows back through the chain in reverse order

### Conditional Middleware

You can create middleware that only applies under certain conditions:

```typescript
import type { LanguageModelV1Middleware } from "ai";

export const createConditionalMiddleware = (
  condition: (params: any) => boolean,
  middleware: LanguageModelV1Middleware,
): LanguageModelV1Middleware => {
  return {
    transformParams: async (args) => {
      if (condition(args.params)) {
        return middleware.transformParams
          ? await middleware.transformParams(args)
          : args.params;
      }
      return args.params;
    },

    wrapGenerate: async (args) => {
      if (condition(args.params)) {
        return middleware.wrapGenerate
          ? await middleware.wrapGenerate(args)
          : await args.doGenerate();
      }
      return await args.doGenerate();
    },

    wrapStream: async (args) => {
      if (condition(args.params)) {
        return middleware.wrapStream
          ? await middleware.wrapStream(args)
          : await args.doStream();
      }
      return await args.doStream();
    },
  };
};

// Example usage
const debugModeMiddleware = createConditionalMiddleware(
  (params) => params.debug === true,
  loggingMiddleware,
);
```

### Factory Functions for Configurable Middleware

You can create factory functions that return configured middleware instances:

```typescript
import type { LanguageModelV1Middleware } from "ai";

export const createRateLimitingMiddleware = (
  maxRequestsPerMinute: number,
): LanguageModelV1Middleware => {
  const requestTimestamps: number[] = [];

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const now = Date.now();

      // Remove timestamps older than 1 minute
      const oneMinuteAgo = now - 60 * 1000;
      while (
        requestTimestamps.length > 0 &&
        requestTimestamps[0] < oneMinuteAgo
      ) {
        requestTimestamps.shift();
      }

      // Check if we've exceeded the rate limit
      if (requestTimestamps.length >= maxRequestsPerMinute) {
        throw new Error(
          `Rate limit exceeded: ${maxRequestsPerMinute} requests per minute`,
        );
      }

      // Add the current timestamp to the list
      requestTimestamps.push(now);

      // Call the original doGenerate method
      return await doGenerate();
    },
  };
};

// Example usage
const rateLimitingMiddleware = createRateLimitingMiddleware(10);
```

## Best Practices

When developing custom middleware for NeuroLink, consider the following best practices:

1. **Keep middleware focused**: Each middleware component should have a single responsibility.
2. **Handle errors gracefully**: Middleware should catch and handle errors appropriately, without breaking the application.
3. **Be mindful of performance**: Middleware adds overhead to each request, so keep it as efficient as possible.
4. **Use TypeScript**: TypeScript provides type safety and better IDE support, making it easier to develop and maintain middleware.
5. **Document your middleware**: Provide clear documentation on what your middleware does and how to use it.
6. **Test your middleware**: Write unit tests for your middleware to ensure it behaves as expected.
7. **Consider streaming**: Remember that streaming responses require special handling in middleware.

## Conclusion

Custom middleware provides a powerful way to extend and enhance the functionality of language models in NeuroLink. By following the patterns and best practices outlined in this guide, you can create reusable, composable middleware components that improve the quality, reliability, and performance of your AI applications.
