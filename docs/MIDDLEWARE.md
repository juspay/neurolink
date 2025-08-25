# NeuroLink Middleware System

This document provides a comprehensive guide to the middleware system in NeuroLink. The middleware system allows you to enhance, modify, or extend the behavior of language models without changing their core implementation.

## Overview

The middleware system in NeuroLink follows the interceptor pattern, allowing developers to intercept and modify the flow of data between the application and language models. This approach enables a clean separation of concerns and promotes modularity in your AI applications.

NeuroLink's middleware system is built around the `MiddlewareFactory`, a powerful and intuitive class that simplifies the process of creating, configuring, and applying middleware to language models.

## Architecture

The new middleware architecture is designed for simplicity and ease of use. The `MiddlewareFactory` is the primary entry point and manages all aspects of the middleware lifecycle.

```mermaid
graph TD
    A[Application] --> B[new MiddlewareFactory(options)]
    B --> C{Applies Middleware}
    C --> D[Language Model]
    D --> C
    C --> B
    B --> A[Returns Wrapped Model]
```

## Key Concepts

### MiddlewareFactory

The `MiddlewareFactory` is the central class for all middleware operations. It provides a clean, instance-based API for managing middleware configurations and applying them to language models.

- **Flexible Configuration**: The factory is configured through a combination of constructor options and call-time options passed to `applyMiddleware`.
- **Predictable Precedence**: The final middleware configuration is determined by a clear order of precedence:
  1.  A base configuration is established (either a named preset or the `'default'` preset if no other configuration is provided).
  2.  This is overridden by `middlewareConfig` from the constructor.
  3.  This is further overridden by `middlewareConfig` from the `applyMiddleware` call.
  4.  Finally, `enabledMiddleware` and `disabledMiddleware` arrays provide the final say on which middleware are active for a given call.
- **Instance-Based Registry**: Each factory instance manages its own private registry, ensuring that configurations are encapsulated and do not interfere with each other.

### Presets

Presets are pre-defined configurations for common use cases. You can use a preset to quickly configure a factory with a set of middleware.

- **`default`**: The default preset, which includes basic analytics.
- **`all`**: Enables all available built-in middleware, including analytics and guardrails.
- **`security`**: Focuses on security and includes the `guardrails` middleware.

### Custom Middleware

You can easily create and register your own custom middleware to extend the functionality of the system. See the [Custom Middleware Guide](./CUSTOM-MIDDLEWARE-GUIDE.md) for more details.

## Basic Usage

Here's how to use the `MiddlewareFactory` to apply middleware to a language model:

```typescript
import { MiddlewareFactory } from "@neurolink/middleware";
import type { LanguageModelV1 } from "ai";

// 1. Create a MiddlewareFactory instance with a preset
const factory = new MiddlewareFactory({ preset: "all" });

// 2. Create a middleware context
const context = factory.createContext(
  "openai",
  "gpt-4",
  { prompt: "Hello, world!" },
  { sessionId: "test-session" },
);

// 3. Apply the middleware to your base model
const wrappedModel = factory.applyMiddleware(baseModel, context);

// 4. Use the wrapped model
const result = await wrappedModel.generate({
  prompt: "Hello, world!",
});
```

This new architecture simplifies the process of working with middleware, making it easier than ever to enhance and secure your AI applications.
