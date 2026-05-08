[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicResolutionContext

# Type Alias: DynamicResolutionContext

> **DynamicResolutionContext** = `object`

Defined in: [types/dynamic.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L21)

Context passed to context-aware dynamic argument functions.
`requestContext` is whatever the consumer passed as `dynamicContext` —
NeuroLink does not prescribe its shape.

## Properties

### requestContext

> **requestContext**: `Record`\<`string`, `unknown`\>

Defined in: [types/dynamic.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L23)

Consumer-provided context (any shape)

---

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types/dynamic.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L25)

Abort signal for cancellation
