[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:944](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L944)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:946](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L946)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:948](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L948)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L950)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:952](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L952)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:954](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L954)

AI SDK v6 name for completion / output tokens
