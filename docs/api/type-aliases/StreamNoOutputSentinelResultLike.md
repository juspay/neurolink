[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamNoOutputSentinelResultLike

# Type Alias: StreamNoOutputSentinelResultLike

> **StreamNoOutputSentinelResultLike** = `object`

Defined in: [types/noOutputSentinel.ts:24](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/noOutputSentinel.ts#L24)

Subset of AI SDK's `StreamTextResult` that the sentinel builder reads.
Both fields are Promises in production but typed loosely so callers
can pass either the Promise or a resolved value.

## Properties

### finishReason?

> `optional` **finishReason?**: `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/noOutputSentinel.ts:25](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/noOutputSentinel.ts#L25)

---

### totalUsage?

> `optional` **totalUsage?**: `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/noOutputSentinel.ts:26](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/noOutputSentinel.ts#L26)
