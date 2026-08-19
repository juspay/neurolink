[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTextResult

# Type Alias: StreamTextResult

> **StreamTextResult** = `object`

Defined in: [types/stream.ts:904](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L904)

Stream text result from AI SDK (compatible with both v4 and v6)

AI SDK v6 changed Promise → PromiseLike and renamed usage fields
(promptTokens → inputTokens, completionTokens → outputTokens).
This type accepts either shape so callers don't need casts.

## Properties

### textStream

> **textStream**: `AsyncIterable`\<`string`\>

Defined in: [types/stream.ts:905](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L905)

---

### fullStream?

> `optional` **fullStream?**: `AsyncIterable`\<`unknown`\>

Defined in: [types/stream.ts:906](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L906)

---

### text

> **text**: `PromiseLike`\<`string`\>

Defined in: [types/stream.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L907)

---

### usage

> **usage**: `PromiseLike`\<[`AISDKUsage`](AISDKUsage.md) \| `undefined`\>

Defined in: [types/stream.ts:908](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L908)

---

### response

> **response**: `PromiseLike`\<\{ `id?`: `string`; `model?`: `string`; `timestamp?`: `number` \| `Date`; \} \| `undefined`\>

Defined in: [types/stream.ts:909](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L909)

---

### finishReason

> **finishReason**: `PromiseLike`\<`"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"other"` \| `"unknown"`\>

Defined in: [types/stream.ts:917](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L917)

---

### toolResults?

> `optional` **toolResults?**: `PromiseLike`\<[`StreamToolResult`](StreamToolResult.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L930)

Tool results. Accepts both NeuroLink StreamToolResult[] and AI SDK TypedToolResult[],
since the analytics collector passes them through as `unknown` anyway.

---

### toolCalls?

> `optional` **toolCalls?**: `PromiseLike`\<[`StreamToolCall`](StreamToolCall.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L934)

Tool calls. Accepts both NeuroLink StreamToolCall[] and AI SDK TypedToolCall[].
