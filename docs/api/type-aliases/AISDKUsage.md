[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:1158](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1158)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:1160](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1160)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1162)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1164)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1166)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1168)

AI SDK v6 name for completion / output tokens
