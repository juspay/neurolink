[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileWithMetadata

# Type Alias: FileWithMetadata

> **FileWithMetadata** = `object`

Defined in: [types/file.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L41)

File with metadata — allows callers to pass filename alongside a Buffer.

This is the recommended way for applications (e.g. Slack bots) to pass
files that were downloaded as Buffers but still have original filenames.

## Example

```typescript
files: [
  { buffer: pdfBuffer, filename: "quarterly-report.pdf" },
  {
    buffer: videoBuffer,
    filename: "meeting-recording.mov",
    mimetype: "video/quicktime",
  },
];
```

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L42)

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L43)

---

### mimetype?

> `optional` **mimetype?**: `string`

Defined in: [types/file.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L44)
