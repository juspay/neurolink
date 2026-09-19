[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTextResult

# Type Alias: StreamTextResult

> **StreamTextResult** = `object`

Defined in: [types/stream.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1058)

Stream text result from AI SDK (compatible with both v4 and v6)

AI SDK v6 changed Promise → PromiseLike and renamed usage fields
(promptTokens → inputTokens, completionTokens → outputTokens).
This type accepts either shape so callers don't need casts.

## Properties

### textStream

> **textStream**: `AsyncIterable`\<`string`\>

Defined in: [types/stream.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1059)

---

### fullStream?

> `optional` **fullStream?**: `AsyncIterable`\<`unknown`\>

Defined in: [types/stream.ts:1060](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1060)

---

### text

> **text**: `PromiseLike`\<`string`\>

Defined in: [types/stream.ts:1061](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1061)

---

### usage

> **usage**: `PromiseLike`\<[`AISDKUsage`](AISDKUsage.md) \| `undefined`\>

Defined in: [types/stream.ts:1062](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1062)

---

### response

> **response**: `PromiseLike`\<\{ `id?`: `string`; `model?`: `string`; `timestamp?`: `number` \| `Date`; \} \| `undefined`\>

Defined in: [types/stream.ts:1063](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1063)

---

### finishReason

> **finishReason**: `PromiseLike`\<`"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"other"` \| `"unknown"`\>

Defined in: [types/stream.ts:1071](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1071)

---

### toolResults?

> `optional` **toolResults?**: `PromiseLike`\<[`StreamToolResult`](StreamToolResult.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:1084](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1084)

Tool results. Accepts both NeuroLink StreamToolResult[] and AI SDK TypedToolResult[],
since the analytics collector passes them through as `unknown` anyway.

---

### toolCalls?

> `optional` **toolCalls?**: `PromiseLike`\<[`StreamToolCall`](StreamToolCall.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:1088](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1088)

Tool calls. Accepts both NeuroLink StreamToolCall[] and AI SDK TypedToolCall[].
