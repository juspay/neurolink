# Custom Middleware Development Guide

This document provides a comprehensive guide to developing and implementing custom middleware in the NeuroLink platform. Middleware offers a powerful way to enhance, modify, or extend the behavior of language models without changing their core implementation.

## Overview

Middleware in NeuroLink allows you to intercept and modify the flow of data between your application and the language models. With the new `MiddlewareFactory`, creating and registering custom middleware is simpler and more intuitive than ever.

## Creating a Custom Middleware

A custom middleware is a standard object that implements the `NeuroLinkMiddleware` interface. This interface includes a `metadata` object and optional `wrapGenerate` or `wrapStream` methods.

Here is a basic template for a custom logging middleware:

```typescript
import type { NeuroLinkMiddleware } from "@neurolink/middleware";

export const createLoggingMiddleware = (): NeuroLinkMiddleware => ({
  metadata: {
    id: "custom-logger",
    name: "Custom Logging Middleware",
    priority: 150, // Higher priority runs earlier
  },
  wrapGenerate: async ({ doGenerate, params }) => {
    console.log(`[Custom Logger] Request sent with params:`, params);
    const result = await doGenerate();
    console.log(`[Custom Logger] Response received.`);
    return result;
  },
});
```

## Registering Your Custom Middleware

With the new `MiddlewareFactory`, you have two easy ways to register your custom middleware.

### 1. Registering on Instantiation

You can provide an array of custom middleware directly to the `MiddlewareFactory` constructor. This is the recommended approach for most use cases.

```typescript
import { MiddlewareFactory } from "@neurolink/middleware";
import { createLoggingMiddleware } from "./my-logging-middleware.js";

const loggingMiddleware = createLoggingMiddleware();

// Pass your custom middleware directly to the constructor
const factory = new MiddlewareFactory({
  preset: "default", // You can still use presets
  middleware: [loggingMiddleware],
});

// The factory is now ready to use with your custom middleware included
```

### 2. Registering After Instantiation

If you need to add middleware dynamically after the factory has been created, you can use the public `.register()` method.

```typescript
import { MiddlewareFactory } from "@neurolink/middleware";
import { createCachingMiddleware } from "./my-caching-middleware.js";

const factory = new MiddlewareFactory(); // Initialize with default settings

// Create and register your middleware instance
const cachingMiddleware = createCachingMiddleware();
factory.register(cachingMiddleware);

// The factory will now include the caching middleware in its chain
```

## Enabling Custom Middleware

Registering a middleware makes it available to the factory, but it does not activate it. To enable a middleware for a specific `applyMiddleware` call, you must include its ID in the `enabledMiddleware` array in the options.

```typescript
// ... inside an async function
const context = factory.createContext("test-provider", "test-model");

// Enable your custom middleware by its ID
const wrappedModel = factory.applyMiddleware(baseModel, context, {
  enabledMiddleware: ["custom-logger"],
});
```

## Full Example

Here is a complete example of how to create, register, and apply a custom middleware.

```typescript
import { MiddlewareFactory } from "@neurolink/middleware";
import type {
  LanguageModelV1,
  NeuroLinkMiddleware,
} from "@neurolink/middleware";

// 1. Define your custom middleware
const myCustomMiddleware: NeuroLinkMiddleware = {
  metadata: {
    id: "request-validator",
    name: "Request Validator",
  },
  wrapGenerate: async ({ doGenerate, params }) => {
    if (!params.prompt) {
      throw new Error("Prompt is required.");
    }
    return doGenerate();
  },
};

// 2. Create a factory and register the middleware
const factory = new MiddlewareFactory({
  middleware: [myCustomMiddleware],
});

// 3. Create a context and apply the middleware, enabling the custom one
const context = factory.createContext("test-provider", "test-model");
const wrappedModel = factory.applyMiddleware(baseModel, context, {
  enabledMiddleware: ["request-validator"],
});

// 4. Use the wrapped model
// This will now throw an error if the prompt is missing.
const result = await wrappedModel.generate({ prompt: "" });
```

This new, streamlined approach makes it easier than ever to extend the NeuroLink platform with your own custom logic, while maintaining a clean and organized architecture.
