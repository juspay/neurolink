[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:1128](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1128)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:1130](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1130)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:1132](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1132)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:1134](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1134)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1136)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1138)

AI SDK v6 name for completion / output tokens
