[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OfficeProcessorOptions

# Type Alias: OfficeProcessorOptions

> **OfficeProcessorOptions** = `object`

Defined in: [types/file.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L489)

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

Defined in: [types/file.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L491)

Office document format type

---

### extractTextOnly?

> `optional` **extractTextOnly?**: `boolean`

Defined in: [types/file.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L493)

Whether to extract text only (true) or preserve formatting (false). Applies to: docx, pptx, xlsx

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L495)

Maximum file size in megabytes. Applies to: docx, pptx, xlsx

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Defined in: [types/file.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L497)

Whether to include metadata (author, created date, etc.). Applies to: docx, pptx, xlsx

---

### processAllSheets?

> `optional` **processAllSheets?**: `boolean`

Defined in: [types/file.ts:499](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L499)

For spreadsheets (xlsx only): whether to process all sheets or just the first

---

### includeSlideNotes?

> `optional` **includeSlideNotes?**: `boolean`

Defined in: [types/file.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L501)

For presentations (pptx only): whether to include slide notes

---

### sheetName?

> `optional` **sheetName?**: `string`

Defined in: [types/file.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L508)

For spreadsheets (xlsx only): restrict processing to the named sheet.
When the workbook has no sheet by that name the result says so and lists
the names it does have, rather than silently falling back to every sheet.
Omit to process every sheet (the default).

---

### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"` \| `"csv"`

Defined in: [types/file.ts:516](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L516)

For spreadsheets (xlsx only): how sheet data is rendered into the prompt.

- `raw` (default): tab-separated preview — the long-standing behaviour
- `csv`: comma-separated values with RFC 4180 quoting
- `markdown`: a markdown table per sheet
- `json`: an array of row objects keyed by the header row
