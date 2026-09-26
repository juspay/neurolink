[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OfficeProcessorOptions

# Type Alias: OfficeProcessorOptions

> **OfficeProcessorOptions** = `object`

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

Office document format type

---

### extractTextOnly?

> `optional` **extractTextOnly?**: `boolean`

Whether to extract text only (true) or preserve formatting (false). Applies to: docx, pptx, xlsx

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Maximum file size in megabytes. Applies to: docx, pptx, xlsx

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Whether to include metadata (author, created date, etc.). Applies to: docx, pptx, xlsx

---

### processAllSheets?

> `optional` **processAllSheets?**: `boolean`

For spreadsheets (xlsx only): whether to process all sheets or just the first

---

### includeSlideNotes?

> `optional` **includeSlideNotes?**: `boolean`

For presentations (pptx only): whether to include slide notes

---

### sheetName?

> `optional` **sheetName?**: `string`

For spreadsheets (xlsx only): restrict processing to the named sheet.
When the workbook has no sheet by that name the result says so and lists
the names it does have, rather than silently falling back to every sheet.
Omit to process every sheet (the default).

---

### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"` \| `"csv"`

For spreadsheets (xlsx only): how sheet data is rendered into the prompt.

- `raw` (default): tab-separated preview — the long-standing behaviour
- `csv`: comma-separated values with RFC 4180 quoting
- `markdown`: a markdown table per sheet
- `json`: an array of row objects keyed by the header row
