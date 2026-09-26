[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamNoOutputSentinelResultLike

# Type Alias: StreamNoOutputSentinelResultLike

> **StreamNoOutputSentinelResultLike** = `object`

Subset of AI SDK's `StreamTextResult` that the sentinel builder reads.
Both fields are Promises in production but typed loosely so callers
can pass either the Promise or a resolved value.

## Properties

### finishReason?

> `optional` **finishReason?**: `Promise`\<`unknown`\> \| `unknown`

---

### totalUsage?

> `optional` **totalUsage?**: `Promise`\<`unknown`\> \| `unknown`
