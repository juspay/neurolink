[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileInfo

# Type Alias: FileInfo

> **FileInfo** = `object`

Defined in: [types/processor.ts:31](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L31)

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

Defined in: [types/processor.ts:33](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L33)

Unique identifier for the file

---

### name

> **name**: `string`

Defined in: [types/processor.ts:35](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L35)

Original filename

---

### mimetype

> **mimetype**: `string`

Defined in: [types/processor.ts:37](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L37)

MIME type of the file

---

### size

> **size**: `number`

Defined in: [types/processor.ts:39](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L39)

File size in bytes

---

### url?

> `optional` **url?**: `string`

Defined in: [types/processor.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L41)

Download URL (optional - use when file needs to be fetched)

---

### buffer?

> `optional` **buffer?**: `Buffer`

Defined in: [types/processor.ts:43](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L43)

Direct file content (optional - use when file is already in memory)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/processor.ts:45](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L45)

Extensibility - additional provider-specific metadata
