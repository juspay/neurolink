[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTextResult

# Type Alias: StreamTextResult

> **StreamTextResult** = `object`

Defined in: [types/stream.ts:872](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L872)

Stream text result from AI SDK (compatible with both v4 and v6)

AI SDK v6 changed Promise → PromiseLike and renamed usage fields
(promptTokens → inputTokens, completionTokens → outputTokens).
This type accepts either shape so callers don't need casts.

## Properties

### textStream

> **textStream**: `AsyncIterable`\<`string`\>

Defined in: [types/stream.ts:873](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L873)

---

### fullStream?

> `optional` **fullStream?**: `AsyncIterable`\<`unknown`\>

Defined in: [types/stream.ts:874](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L874)

---

### text

> **text**: `PromiseLike`\<`string`\>

Defined in: [types/stream.ts:875](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L875)

---

### usage

> **usage**: `PromiseLike`\<[`AISDKUsage`](AISDKUsage.md) \| `undefined`\>

Defined in: [types/stream.ts:876](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L876)

---

### response

> **response**: `PromiseLike`\<\{ `id?`: `string`; `model?`: `string`; `timestamp?`: `number` \| `Date`; \} \| `undefined`\>

Defined in: [types/stream.ts:877](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L877)

---

### finishReason

> **finishReason**: `PromiseLike`\<`"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"other"` \| `"unknown"`\>

Defined in: [types/stream.ts:885](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L885)

---

### toolResults?

> `optional` **toolResults?**: `PromiseLike`\<[`StreamToolResult`](StreamToolResult.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:898](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L898)

Tool results. Accepts both NeuroLink StreamToolResult[] and AI SDK TypedToolResult[],
since the analytics collector passes them through as `unknown` anyway.

---

### toolCalls?

> `optional` **toolCalls?**: `PromiseLike`\<[`StreamToolCall`](StreamToolCall.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:902](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L902)

Tool calls. Accepts both NeuroLink StreamToolCall[] and AI SDK TypedToolCall[].
