[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTextResult

# Type Alias: StreamTextResult

> **StreamTextResult** = `object`

Defined in: [types/stream.ts:860](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L860)

Stream text result from AI SDK (compatible with both v4 and v6)

AI SDK v6 changed Promise → PromiseLike and renamed usage fields
(promptTokens → inputTokens, completionTokens → outputTokens).
This type accepts either shape so callers don't need casts.

## Properties

### textStream

> **textStream**: `AsyncIterable`\<`string`\>

Defined in: [types/stream.ts:861](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L861)

---

### fullStream?

> `optional` **fullStream?**: `AsyncIterable`\<`unknown`\>

Defined in: [types/stream.ts:862](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L862)

---

### text

> **text**: `PromiseLike`\<`string`\>

Defined in: [types/stream.ts:863](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L863)

---

### usage

> **usage**: `PromiseLike`\<[`AISDKUsage`](AISDKUsage.md) \| `undefined`\>

Defined in: [types/stream.ts:864](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L864)

---

### response

> **response**: `PromiseLike`\<\{ `id?`: `string`; `model?`: `string`; `timestamp?`: `number` \| `Date`; \} \| `undefined`\>

Defined in: [types/stream.ts:865](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L865)

---

### finishReason

> **finishReason**: `PromiseLike`\<`"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"other"` \| `"unknown"`\>

Defined in: [types/stream.ts:873](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L873)

---

### toolResults?

> `optional` **toolResults?**: `PromiseLike`\<[`StreamToolResult`](StreamToolResult.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:886](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L886)

Tool results. Accepts both NeuroLink StreamToolResult[] and AI SDK TypedToolResult[],
since the analytics collector passes them through as `unknown` anyway.

---

### toolCalls?

> `optional` **toolCalls?**: `PromiseLike`\<[`StreamToolCall`](StreamToolCall.md)[] \| `ReadonlyArray`\<`unknown`\>\>

Defined in: [types/stream.ts:890](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L890)

Tool calls. Accepts both NeuroLink StreamToolCall[] and AI SDK TypedToolCall[].
