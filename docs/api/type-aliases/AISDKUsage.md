[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:912](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L912)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:914](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L914)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:916](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L916)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:918](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L918)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:920](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L920)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L922)

AI SDK v6 name for completion / output tokens
