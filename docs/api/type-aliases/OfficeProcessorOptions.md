[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OfficeProcessorOptions

# Type Alias: OfficeProcessorOptions

> **OfficeProcessorOptions** = `object`

Defined in: [types/file.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L715)

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

Defined in: [types/file.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L717)

Office document format type

---

### extractTextOnly?

> `optional` **extractTextOnly?**: `boolean`

Defined in: [types/file.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L719)

Whether to extract text only (true) or preserve formatting (false). Applies to: docx, pptx, xlsx

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:721](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L721)

Maximum file size in megabytes. Applies to: docx, pptx, xlsx

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Defined in: [types/file.ts:723](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L723)

Whether to include metadata (author, created date, etc.). Applies to: docx, pptx, xlsx

---

### processAllSheets?

> `optional` **processAllSheets?**: `boolean`

Defined in: [types/file.ts:725](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L725)

For spreadsheets (xlsx only): whether to process all sheets or just the first

---

### includeSlideNotes?

> `optional` **includeSlideNotes?**: `boolean`

Defined in: [types/file.ts:727](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L727)

For presentations (pptx only): whether to include slide notes
