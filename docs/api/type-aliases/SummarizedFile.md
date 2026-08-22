[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizedFile

# Type Alias: SummarizedFile

> **SummarizedFile** = `object`

Defined in: [types/context.ts:770](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L770)

Result item from `planFileSummarization()`.

## Properties

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:772](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L772)

File display name

---

### fileType

> **fileType**: `string`

Defined in: [types/context.ts:774](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L774)

File type label

---

### summary

> **summary**: `string`

Defined in: [types/context.ts:776](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L776)

Summary text (or original content if not summarized)

---

### originalTokens

> **originalTokens**: `number`

Defined in: [types/context.ts:778](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L778)

Original token estimate

---

### summaryTokens

> **summaryTokens**: `number`

Defined in: [types/context.ts:780](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L780)

Token estimate of the summary

---

### wasSummarized

> **wasSummarized**: `boolean`

Defined in: [types/context.ts:782](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L782)

Whether this file was actually summarized
