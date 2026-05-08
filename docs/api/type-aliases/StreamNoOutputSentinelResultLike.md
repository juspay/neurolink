[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamNoOutputSentinelResultLike

# Type Alias: StreamNoOutputSentinelResultLike

> **StreamNoOutputSentinelResultLike** = `object`

Defined in: [types/noOutputSentinel.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/noOutputSentinel.ts#L24)

Subset of AI SDK's `StreamTextResult` that the sentinel builder reads.
Both fields are Promises in production but typed loosely so callers
can pass either the Promise or a resolved value.

## Properties

### finishReason?

> `optional` **finishReason?**: `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/noOutputSentinel.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/noOutputSentinel.ts#L25)

---

### totalUsage?

> `optional` **totalUsage?**: `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/noOutputSentinel.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/noOutputSentinel.ts#L26)
