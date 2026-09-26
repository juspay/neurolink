[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTextResult

# Type Alias: StreamTextResult

> **StreamTextResult** = `object`

Defined in: [types/stream.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1106)

Stream text result from AI SDK (compatible with both v4 and v6)

AI SDK v6 changed Promise → PromiseLike and renamed usage fields
(promptTokens → inputTokens, completionTokens → outputTokens).
This type accepts either shape so callers don't need casts.

## Properties

### textStream

> **textStream**: `AsyncIterable`\<`string`\>

Defined in: [types/stream.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1107)

---

### fullStream?

> `optional` **fullStream?**: `AsyncIterable`\<`unknown`\>

Defined in: [types/stream.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1108)

---

### text

> **text**: `PromiseLike`\<`string`\>

Defined in: [types/stream.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1109)

---

### usage

> **usage**: `PromiseLike`\<[`AISDKUsage`](AISDKUsage.md) \| `undefined`\>

Defined in: [types/stream.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1110)

---

### response

> **response**: `PromiseLike`\<\{ `id?`: `string`; `model?`: `string`; `timestamp?`: `number` \| `Date`; \} \| `undefined`\>

Defined in: [types/stream.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1111)

---

### finishReason

> **finishReason**: `PromiseLike`\<`"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"other"` \| `"unknown"`\>

Defined in: [types/stream.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1119)

---

### toolResults?

> `optional` **toolResults?**: `PromiseLike`\<[`StreamToolResult`](StreamToolResult.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:1132](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1132)

Tool results. Accepts both NeuroLink StreamToolResult[] and AI SDK TypedToolResult[],
since the analytics collector passes them through as `unknown` anyway.

---

### toolCalls?

> `optional` **toolCalls?**: `PromiseLike`\<[`StreamToolCall`](StreamToolCall.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1136)

Tool calls. Accepts both NeuroLink StreamToolCall[] and AI SDK TypedToolCall[].
