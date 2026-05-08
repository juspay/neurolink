[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSearchResult

# Type Alias: FileSearchResult

> **FileSearchResult** = `object`

Defined in: [types/fileReference.ts:152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L152)

Result of searching within a file

## Properties

### matches

> **matches**: [`FileSearchMatch`](FileSearchMatch.md)[]

Defined in: [types/fileReference.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L154)

Matching lines with context

---

### totalMatches

> **totalMatches**: `number`

Defined in: [types/fileReference.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L156)

Total number of matches found

---

### truncated

> **truncated**: `boolean`

Defined in: [types/fileReference.ts:158](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L158)

Whether results were truncated
