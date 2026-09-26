[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizedFile

# Type Alias: SummarizedFile

> **SummarizedFile** = `object`

Result item from `planFileSummarization()`.

## Properties

### fileName

> **fileName**: `string`

File display name

---

### fileType

> **fileType**: `string`

File type label

---

### summary

> **summary**: `string`

Summary text (or original content if not summarized)

---

### originalTokens

> **originalTokens**: `number`

Original token estimate

---

### summaryTokens

> **summaryTokens**: `number`

Token estimate of the summary

---

### wasSummarized

> **wasSummarized**: `boolean`

Whether this file was actually summarized
