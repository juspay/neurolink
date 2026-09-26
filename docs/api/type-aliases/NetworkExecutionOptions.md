[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionOptions

# Type Alias: NetworkExecutionOptions

> **NetworkExecutionOptions** = `object`

Options for network execution

## Properties

### maxSteps?

> `optional` **maxSteps?**: `number`

Maximum execution steps across the network

---

### timeout?

> `optional` **timeout?**: `number`

Timeout in milliseconds

---

### stream?

> `optional` **stream?**: `boolean`

Enable streaming

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Additional context

---

### tracing?

> `optional` **tracing?**: `object`

Tracing configuration

#### enabled?

> `optional` **enabled?**: `boolean`

#### traceId?

> `optional` **traceId?**: `string`

#### parentSpanId?

> `optional` **parentSpanId?**: `string`

---

### modelSettings?

> `optional` **modelSettings?**: `object`

Model settings override

#### temperature?

> `optional` **temperature?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

#### topP?

> `optional` **topP?**: `number`

---

### outputSchema?

> `optional` **outputSchema?**: `z.ZodSchema`

Output schema for structured output
