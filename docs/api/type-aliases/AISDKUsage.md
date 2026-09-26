[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

AI SDK v6 name for completion / output tokens
