[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1135)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:1137](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1137)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:1139](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1139)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1141)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:1143](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1143)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:1145](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1145)

AI SDK v6 name for completion / output tokens
