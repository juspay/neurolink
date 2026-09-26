[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicResolutionContext

# Type Alias: DynamicResolutionContext

> **DynamicResolutionContext** = `object`

Context passed to context-aware dynamic argument functions.
`requestContext` is whatever the consumer passed as `dynamicContext` —
NeuroLink does not prescribe its shape.

## Properties

### requestContext

> **requestContext**: `Record`\<`string`, `unknown`\>

Consumer-provided context (any shape)

---

### signal?

> `optional` **signal?**: `AbortSignal`

Abort signal for cancellation
