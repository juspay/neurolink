[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OfficeProcessorOptions

# Type Alias: OfficeProcessorOptions

> **OfficeProcessorOptions** = `object`

Defined in: [types/file.ts:331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L331)

Office processor options for Word, PowerPoint, and Excel documents

## Examples

```typescript
const options: OfficeProcessorOptions = {
  format: "docx",
  extractTextOnly: false,
  includeMetadata: true,
};
```

```typescript
const options: OfficeProcessorOptions = {
  format: "pptx",
  includeSlideNotes: true, // pptx-specific
  includeMetadata: true,
};
```

```typescript
const options: OfficeProcessorOptions = {
  format: "xlsx",
  processAllSheets: true, // xlsx-specific
  includeMetadata: true,
};
```

## Properties

### format?

> `optional` **format?**: [`OfficeDocumentType`](OfficeDocumentType.md)

Defined in: [types/file.ts:333](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L333)

Office document format type

---

### extractTextOnly?

> `optional` **extractTextOnly?**: `boolean`

Defined in: [types/file.ts:335](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L335)

Whether to extract text only (true) or preserve formatting (false). Applies to: docx, pptx, xlsx

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:337](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L337)

Maximum file size in megabytes. Applies to: docx, pptx, xlsx

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Defined in: [types/file.ts:339](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L339)

Whether to include metadata (author, created date, etc.). Applies to: docx, pptx, xlsx

---

### processAllSheets?

> `optional` **processAllSheets?**: `boolean`

Defined in: [types/file.ts:341](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L341)

For spreadsheets (xlsx only): whether to process all sheets or just the first

---

### includeSlideNotes?

> `optional` **includeSlideNotes?**: `boolean`

Defined in: [types/file.ts:343](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L343)

For presentations (pptx only): whether to include slide notes
