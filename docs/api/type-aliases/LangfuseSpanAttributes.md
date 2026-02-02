[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseSpanAttributes

# Type Alias: LangfuseSpanAttributes

> **LangfuseSpanAttributes** = `object`

Defined in: [types/observability.ts:14](https://github.com/juspay/neurolink/blob/main/src/lib/types/observability.ts#L14)

Standard GenAI semantic convention attributes from OpenTelemetry

These are the attributes that Vercel AI SDK's `experimental_telemetry` creates on spans.
NeuroLink's ContextEnricher reads these attributes in `onEnd()` to log token usage
and other GenAI-specific metrics.

## Properties

### Core GenAI Attributes

These follow the OpenTelemetry GenAI semantic conventions:

| Property                         | Type       | Description                                           |
| -------------------------------- | ---------- | ----------------------------------------------------- |
| `gen_ai.system`                  | `string`   | AI system/provider name (e.g., "openai", "anthropic") |
| `gen_ai.request.model`           | `string`   | Model name used in request                            |
| `gen_ai.response.model`          | `string`   | Actual model used in response                         |
| `gen_ai.request.max_tokens`      | `number`   | Max tokens requested                                  |
| `gen_ai.request.temperature`     | `number`   | Temperature setting                                   |
| `gen_ai.request.top_p`           | `number`   | Top-p sampling setting                                |
| `gen_ai.usage.input_tokens`      | `number`   | Input/prompt tokens used                              |
| `gen_ai.usage.output_tokens`     | `number`   | Output/completion tokens used                         |
| `gen_ai.usage.total_tokens`      | `number`   | Total tokens used                                     |
| `gen_ai.response.finish_reasons` | `string[]` | Finish reasons from model                             |
| `gen_ai.prompt`                  | `string`   | The prompt sent (if enabled)                          |
| `gen_ai.completion`              | `string`   | The completion received (if enabled)                  |

### Vercel AI SDK Specific Attributes

Additional attributes created by Vercel AI SDK's telemetry:

| Property                    | Type     | Description                       |
| --------------------------- | -------- | --------------------------------- |
| `ai.model.id`               | `string` | Model identifier                  |
| `ai.model.provider`         | `string` | Provider identifier               |
| `ai.operationId`            | `string` | Operation identifier              |
| `ai.telemetry.functionId`   | `string` | Function identifier for telemetry |
| `ai.finishReason`           | `string` | Why generation finished           |
| `ai.usage.promptTokens`     | `number` | Prompt tokens (alias)             |
| `ai.usage.completionTokens` | `number` | Completion tokens (alias)         |

### Custom Attributes

The type also allows arbitrary custom attributes:

```typescript
[key: string]: unknown
```

## Example Usage

```typescript
import type { LangfuseSpanAttributes } from "@juspay/neurolink";

// Type-safe attribute access
function logTokenUsage(attributes: LangfuseSpanAttributes) {
  const inputTokens =
    attributes["gen_ai.usage.input_tokens"] ??
    attributes["ai.usage.promptTokens"];

  const outputTokens =
    attributes["gen_ai.usage.output_tokens"] ??
    attributes["ai.usage.completionTokens"];

  console.log(`Tokens: ${inputTokens} in, ${outputTokens} out`);
}

// Check if span is GenAI-related
function isGenAISpan(attributes: LangfuseSpanAttributes): boolean {
  return !!(
    attributes["gen_ai.system"] ||
    attributes["ai.model.id"] ||
    attributes["gen_ai.request.model"]
  );
}
```

## How NeuroLink Uses These

NeuroLink's `ContextEnricher` span processor reads these attributes in its `onEnd()` method:

1. Detects GenAI spans by checking for `gen_ai.system`, `ai.model.id`, or `gen_ai.request.model`
2. Logs the model and provider for debugging
3. Captures token usage metrics for observability
4. Enriches spans with Langfuse context (userId, sessionId, etc.)

This enables automatic capture of AI operation metrics when using Vercel AI SDK's
`experimental_telemetry` feature with NeuroLink's Langfuse integration.

## See Also

- [setLangfuseContext](../functions/setLangfuseContext.md) - Set context for spans
- [LangfuseConfig](./LangfuseConfig.md) - Langfuse configuration
- [getSpanProcessors](../functions/getSpanProcessors.md) - Get span processors
