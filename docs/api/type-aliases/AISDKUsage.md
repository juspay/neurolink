[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1101)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1103)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:1105](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1105)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1107)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1109)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1111)

AI SDK v6 name for completion / output tokens
