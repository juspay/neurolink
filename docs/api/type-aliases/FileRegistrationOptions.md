[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileRegistrationOptions

# Type Alias: FileRegistrationOptions

> **FileRegistrationOptions** = `object`

Options for registering a file

## Properties

### filename?

> `optional` **filename?**: `string`

Override filename detection

---

### fileType?

> `optional` **fileType?**: [`FileType`](FileType.md)

Override file type detection

---

### mimetype?

> `optional` **mimetype?**: `string`

Caller-provided MIME type hint (e.g. "text/plain", "application/json").
Used when the filename has no extension and magic-byte detection cannot
identify the content (common for Slack/Curator-style buffers where the
original extension was stripped). Honored during type detection, mimeType
assignment, and filename-extension synthesis. An explicit `fileType`
override still wins over this hint.

---

### maxPreviewChars?

> `optional` **maxPreviewChars?**: `number`

Maximum preview length in characters

---

### skipTempPersist?

> `optional` **skipTempPersist?**: `boolean`

Skip persisting buffer to temp directory
