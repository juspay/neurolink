[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTextResult

# Type Alias: StreamTextResult

> **StreamTextResult** = `object`

Defined in: [types/stream.ts:1065](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1065)

Stream text result from AI SDK (compatible with both v4 and v6)

AI SDK v6 changed Promise → PromiseLike and renamed usage fields
(promptTokens → inputTokens, completionTokens → outputTokens).
This type accepts either shape so callers don't need casts.

## Properties

### textStream

> **textStream**: `AsyncIterable`\<`string`\>

Defined in: [types/stream.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1066)

---

### fullStream?

> `optional` **fullStream?**: `AsyncIterable`\<`unknown`\>

Defined in: [types/stream.ts:1067](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1067)

---

### text

> **text**: `PromiseLike`\<`string`\>

Defined in: [types/stream.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1068)

---

### usage

> **usage**: `PromiseLike`\<[`AISDKUsage`](AISDKUsage.md) \| `undefined`\>

Defined in: [types/stream.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1069)

---

### response

> **response**: `PromiseLike`\<\{ `id?`: `string`; `model?`: `string`; `timestamp?`: `number` \| `Date`; \} \| `undefined`\>

Defined in: [types/stream.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1070)

---

### finishReason

> **finishReason**: `PromiseLike`\<`"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"other"` \| `"unknown"`\>

Defined in: [types/stream.ts:1078](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1078)

---

### toolResults?

> `optional` **toolResults?**: `PromiseLike`\<[`StreamToolResult`](StreamToolResult.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1091)

Tool results. Accepts both NeuroLink StreamToolResult[] and AI SDK TypedToolResult[],
since the analytics collector passes them through as `unknown` anyway.

---

### toolCalls?

> `optional` **toolCalls?**: `PromiseLike`\<[`StreamToolCall`](StreamToolCall.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1095)

Tool calls. Accepts both NeuroLink StreamToolCall[] and AI SDK TypedToolCall[].
