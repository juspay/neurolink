[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileReadResult

# Type Alias: FileReadResult

> **FileReadResult** = `object`

Defined in: [types/fileReference.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L134)

Result of reading a file section

## Properties

### content

> **content**: `string`

Defined in: [types/fileReference.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L136)

The content that was read

---

### startLine

> **startLine**: `number`

Defined in: [types/fileReference.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L138)

Starting line number (1-indexed)

---

### endLine

> **endLine**: `number`

Defined in: [types/fileReference.ts:140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L140)

Ending line number (1-indexed)

---

### totalLines

> **totalLines**: `number`

Defined in: [types/fileReference.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L142)

Total lines in the file

---

### truncated

> **truncated**: `boolean`

Defined in: [types/fileReference.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L144)

Whether the content was truncated to fit token budget

---

### estimatedTokens

> **estimatedTokens**: `number`

Defined in: [types/fileReference.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L146)

Number of tokens in the returned content
