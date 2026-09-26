[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileInfo

# Type Alias: FileInfo

> **FileInfo** = `object`

Generic file information - provider agnostic.
Replaces Slack-specific SlackFileInfo with a universal interface.

## Example

```typescript
const fileInfo: FileInfo = {
  id: "doc-123",
  name: "report.pdf",
  mimetype: "application/pdf",
  size: 1024000,
  url: "https://example.com/files/report.pdf",
};
```

## Properties

### id

> **id**: `string`

Unique identifier for the file

---

### name

> **name**: `string`

Original filename

---

### mimetype

> **mimetype**: `string`

MIME type of the file

---

### size

> **size**: `number`

File size in bytes

---

### url?

> `optional` **url?**: `string`

Download URL (optional - use when file needs to be fetched)

---

### buffer?

> `optional` **buffer?**: `Buffer`

Direct file content (optional - use when file is already in memory)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Extensibility - additional provider-specific metadata
