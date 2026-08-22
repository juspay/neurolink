[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamNoOutputSentinelResultLike

# Type Alias: StreamNoOutputSentinelResultLike

> **StreamNoOutputSentinelResultLike** = `object`

Defined in: [types/noOutputSentinel.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/noOutputSentinel.ts#L24)

Subset of AI SDK's `StreamTextResult` that the sentinel builder reads.
Both fields are Promises in production but typed loosely so callers
can pass either the Promise or a resolved value.

## Properties

### finishReason?

> `optional` **finishReason?**: `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/noOutputSentinel.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/noOutputSentinel.ts#L25)

---

### totalUsage?

> `optional` **totalUsage?**: `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/noOutputSentinel.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/noOutputSentinel.ts#L26)
