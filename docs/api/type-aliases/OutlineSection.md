[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OutlineSection

# Type Alias: OutlineSection

> **OutlineSection** = `object`

Defined in: [types/fileReference.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L42)

A section in a file outline (used for code, PDFs, spreadsheets)

## Properties

### name

> **name**: `string`

Defined in: [types/fileReference.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L44)

Section heading/name (e.g., function name, class name, sheet name)

---

### kind

> **kind**: `string`

Defined in: [types/fileReference.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L46)

Type of section (function, class, import, sheet, page, heading)

---

### startLine

> **startLine**: `number`

Defined in: [types/fileReference.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L48)

Starting line number (1-indexed)

---

### endLine

> **endLine**: `number`

Defined in: [types/fileReference.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L50)

Ending line number (1-indexed)

---

### depth

> **depth**: `number`

Defined in: [types/fileReference.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L52)

Nesting depth (0 = top-level)

---

### children?

> `optional` **children?**: `OutlineSection`[]

Defined in: [types/fileReference.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L54)

Child sections (e.g., methods within a class)
