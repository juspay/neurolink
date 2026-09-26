[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineExecutionOptions

# Type Alias: PipelineExecutionOptions

> **PipelineExecutionOptions** = `object`

Pipeline execution options

## Properties

### correlationId?

> `optional` **correlationId?**: `string`

Correlation ID for tracing

---

### timeout?

> `optional` **timeout?**: `number`

Custom timeout override

---

### skipScorers?

> `optional` **skipScorers?**: `string`[]

Skip specific scorers. Mutually exclusive with onlyScorers.

---

### onlyScorers?

> `optional` **onlyScorers?**: `string`[]

Only run specific scorers. Mutually exclusive with skipScorers.

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Additional metadata to attach
