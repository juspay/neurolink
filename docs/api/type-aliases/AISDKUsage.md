[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AISDKUsage

# Type Alias: AISDKUsage

> **AISDKUsage** = `object`

Defined in: [types/stream.ts:900](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L900)

Raw usage data from Vercel AI SDK.

Covers both v4 (promptTokens / completionTokens) and
v6 (inputTokens / outputTokens) field names.
extractTokenUsage() in tokenUtils.ts already handles both shapes.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### ~~promptTokens?~~

> `optional` **promptTokens?**: `number`

Defined in: [types/stream.ts:902](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L902)

#### Deprecated

AI SDK v4 name — use inputTokens

---

### ~~completionTokens?~~

> `optional` **completionTokens?**: `number`

Defined in: [types/stream.ts:904](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L904)

#### Deprecated

AI SDK v4 name — use outputTokens

---

### ~~totalTokens?~~

> `optional` **totalTokens?**: `number`

Defined in: [types/stream.ts:906](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L906)

#### Deprecated

AI SDK v4 name — use totalTokens

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/stream.ts:908](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L908)

AI SDK v6 name for prompt / input tokens

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/stream.ts:910](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L910)

AI SDK v6 name for completion / output tokens
