[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1098)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:1100](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1100)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1102)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1104)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1106)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1108)

AI SDK v6 name for completion / output tokens
