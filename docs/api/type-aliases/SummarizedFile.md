[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizedFile

# Type Alias: SummarizedFile

> **SummarizedFile** = `object`

Defined in: [types/context.ts:747](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L747)

Result item from `planFileSummarization()`.

## Properties

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:749](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L749)

File display name

---

### fileType

> **fileType**: `string`

Defined in: [types/context.ts:751](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L751)

File type label

---

### summary

> **summary**: `string`

Defined in: [types/context.ts:753](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L753)

Summary text (or original content if not summarized)

---

### originalTokens

> **originalTokens**: `number`

Defined in: [types/context.ts:755](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L755)

Original token estimate

---

### summaryTokens

> **summaryTokens**: `number`

Defined in: [types/context.ts:757](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L757)

Token estimate of the summary

---

### wasSummarized

> **wasSummarized**: `boolean`

Defined in: [types/context.ts:759](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L759)

Whether this file was actually summarized
