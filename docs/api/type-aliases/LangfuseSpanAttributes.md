[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseSpanAttributes

# Type Alias: LangfuseSpanAttributes

> **LangfuseSpanAttributes** = `object`

Standard GenAI semantic convention attributes from OpenTelemetry
These are the attributes that Vercel AI SDK's experimental_telemetry creates

## See

https://opentelemetry.io/docs/specs/semconv/gen-ai/

## Indexable

> \[`key`: `string`\]: `AttributeValue` \| `undefined`

## Properties

### gen_ai.system?

> `optional` **gen_ai.system?**: `string`

---

### gen_ai.request.model?

> `optional` **gen_ai.request.model?**: `string`

---

### gen_ai.response.model?

> `optional` **gen_ai.response.model?**: `string`

---

### gen_ai.request.max_tokens?

> `optional` **gen_ai.request.max_tokens?**: `number`

---

### gen_ai.request.temperature?

> `optional` **gen_ai.request.temperature?**: `number`

---

### gen_ai.request.top_p?

> `optional` **gen_ai.request.top_p?**: `number`

---

### gen_ai.usage.input_tokens?

> `optional` **gen_ai.usage.input_tokens?**: `number`

---

### gen_ai.usage.output_tokens?

> `optional` **gen_ai.usage.output_tokens?**: `number`

---

### gen_ai.usage.total_tokens?

> `optional` **gen_ai.usage.total_tokens?**: `number`

---

### gen_ai.response.finish_reasons?

> `optional` **gen_ai.response.finish_reasons?**: `string`[]

---

### gen_ai.prompt?

> `optional` **gen_ai.prompt?**: `string`

---

### gen_ai.completion?

> `optional` **gen_ai.completion?**: `string`

---

### ai.model.id?

> `optional` **ai.model.id?**: `string`

---

### ai.model.provider?

> `optional` **ai.model.provider?**: `string`

---

### ai.operationId?

> `optional` **ai.operationId?**: `string`

---

### ai.telemetry.functionId?

> `optional` **ai.telemetry.functionId?**: `string`

---

### ai.finishReason?

> `optional` **ai.finishReason?**: `string`

---

### ai.usage.promptTokens?

> `optional` **ai.usage.promptTokens?**: `number`

---

### ai.usage.completionTokens?

> `optional` **ai.usage.completionTokens?**: `number`
