[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileWithMetadata

# Type Alias: FileWithMetadata

> **FileWithMetadata** = `object`

Defined in: [types/file.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L134)

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

Defined in: [types/file.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L135)

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L136)

---

### mimetype?

> `optional` **mimetype?**: `string`

Defined in: [types/file.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L137)
