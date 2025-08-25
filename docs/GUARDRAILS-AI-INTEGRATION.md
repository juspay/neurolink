# Guardrails AI Integration with Middleware

This document outlines the modern, simplified approach to integrating Guardrails AI with the NeuroLink platform using the new `MiddlewareFactory`. This enhances the safety, reliability, and security of your AI applications in a modular and maintainable way.

## Overview

Guardrails AI is an open-source library that provides a framework for creating and managing guardrails for large language models (LLMs). By integrating Guardrails AI as middleware, you can enforce specific rules and policies on the inputs and outputs of your models, ensuring they adhere to your safety guidelines and quality standards.

## Key Benefits

- **Risk Mitigation**: Protect against common AI risks such as hallucinations, toxic language, and data leakage.
- **Quality Assurance**: Ensure that model outputs are accurate, relevant, and meet predefined quality criteria.
- **Compliance**: Enforce industry-specific regulations and compliance requirements.
- **Customization**: Create custom guardrails tailored to specific use cases and business needs.

## Middleware-based Guardrail Implementation

With the new `MiddlewareFactory`, integrating guardrails is easier than ever. The factory automatically handles the registration and application of the `guardrails` middleware when you use a relevant preset.

```mermaid
graph TD
    A[Application] --> B[new MiddlewareFactory({ preset: 'security' })];
    subgraph B
        C{Guardrail Middleware Applied} --> D[Core LLM];
    end
    B --> E[Returns Guarded Model];
```

### Using the `security` Preset

The easiest way to enable guardrails is to use the `security` preset when creating your `MiddlewareFactory`. This preset is specifically designed to enable the `guardrails` middleware with a default configuration.

```typescript
import { MiddlewareFactory } from "@neurolink/middleware";
import type { LanguageModelV1 } from "ai";

// 1. Create a factory with the 'security' preset
const factory = new MiddlewareFactory({ preset: "security" });

// 2. Create a context
const context = factory.createContext("openai", "gpt-4");

// 3. Apply the middleware to your base model
// The guardrails middleware is applied automatically.
const guardedModel = factory.applyMiddleware(baseModel, context);

// 4. Use the guarded model
const result = await guardedModel.generate({
  prompt: "This is a test prompt.",
});
```

### Using the `all` Preset

If you want to use guardrails in combination with other built-in middleware like analytics, you can use the `all` preset.

```typescript
import { MiddlewareFactory } from "@neurolink/middleware";

// This will enable both analytics and guardrails
const factory = new MiddlewareFactory({ preset: "all" });
```

### Customizing Guardrails

While presets provide a great starting point, you can also customize the behavior of the guardrails middleware by providing a custom configuration.

```typescript
import { MiddlewareFactory } from "@neurolink/middleware";

const factory = new MiddlewareFactory({
  // You can start with a preset
  preset: "security",
  // And then provide a custom configuration, which will be merged with the preset
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        badWords: {
          enabled: true,
          list: ["custom-bad-word-1", "custom-bad-word-2"],
        },
      },
    },
  },
});
```

This new, streamlined approach provides a clean and scalable way to add safety and other enhancements to your AI models within the NeuroLink ecosystem.
