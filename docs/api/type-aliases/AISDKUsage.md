[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1118)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1120)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:1122](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1122)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:1124](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1124)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:1126](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1126)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:1128](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1128)

AI SDK v6 name for completion / output tokens
