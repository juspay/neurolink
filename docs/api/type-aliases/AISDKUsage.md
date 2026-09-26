[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1146)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1148)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1150)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1152)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1154)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:1156](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1156)

AI SDK v6 name for completion / output tokens
