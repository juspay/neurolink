[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTextResult

# Type Alias: StreamTextResult

> **StreamTextResult** = `object`

Defined in: [types/stream.ts:1088](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1088)

Stream text result from AI SDK (compatible with both v4 and v6)

AI SDK v6 changed Promise → PromiseLike and renamed usage fields
(promptTokens → inputTokens, completionTokens → outputTokens).
This type accepts either shape so callers don't need casts.

## Properties

### textStream

> **textStream**: `AsyncIterable`\<`string`\>

Defined in: [types/stream.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1089)

---

### fullStream?

> `optional` **fullStream?**: `AsyncIterable`\<`unknown`\>

Defined in: [types/stream.ts:1090](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1090)

---

### text

> **text**: `PromiseLike`\<`string`\>

Defined in: [types/stream.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1091)

---

### usage

> **usage**: `PromiseLike`\<[`AISDKUsage`](AISDKUsage.md) \| `undefined`\>

Defined in: [types/stream.ts:1092](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1092)

---

### response

> **response**: `PromiseLike`\<\{ `id?`: `string`; `model?`: `string`; `timestamp?`: `number` \| `Date`; \} \| `undefined`\>

Defined in: [types/stream.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1093)

---

### finishReason

> **finishReason**: `PromiseLike`\<`"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"other"` \| `"unknown"`\>

Defined in: [types/stream.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1101)

---

### toolResults?

> `optional` **toolResults?**: `PromiseLike`\<[`StreamToolResult`](StreamToolResult.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1114)

Tool results. Accepts both NeuroLink StreamToolResult[] and AI SDK TypedToolResult[],
since the analytics collector passes them through as `unknown` anyway.

---

### toolCalls?

> `optional` **toolCalls?**: `PromiseLike`\<[`StreamToolCall`](StreamToolCall.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1118)

Tool calls. Accepts both NeuroLink StreamToolCall[] and AI SDK TypedToolCall[].
