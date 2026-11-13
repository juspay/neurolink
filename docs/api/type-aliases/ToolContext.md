[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolContext

# Type Alias: ToolContext

> **ToolContext** = `object`

Tool execution context

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

---

### userId?

> `optional` **userId?**: `string`

---

### aiProvider?

> `optional` **aiProvider?**: `string`

---

### metadata?

> `optional` **metadata?**: [`ToolExecutionMetadata`](ToolExecutionMetadata.md)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

The loop's signal for this call (its turn abort or per-tool deadline)

---

### pauseDeadline?

> `optional` **pauseDeadline?**: [`PauseDeadline`](PauseDeadline.md)

Pauses the loop's deadlines for this call while it waits for a human
