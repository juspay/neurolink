[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicResolutionContext

# Type Alias: DynamicResolutionContext

> **DynamicResolutionContext** = `object`

Defined in: [types/dynamic.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/dynamic.ts#L22)

Context passed to context-aware dynamic argument functions.
`requestContext` is whatever the consumer passed as `dynamicContext` —
NeuroLink does not prescribe its shape.

## Properties

### requestContext

> **requestContext**: `Record`\<`string`, `unknown`\>

Defined in: [types/dynamic.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/dynamic.ts#L24)

Consumer-provided context (any shape)

---

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types/dynamic.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/dynamic.ts#L26)

Abort signal for cancellation
