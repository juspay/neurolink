[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileRegistrationOptions

# Type Alias: FileRegistrationOptions

> **FileRegistrationOptions** = `object`

Defined in: [types/fileReference.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L111)

Options for registering a file

## Properties

### filename?

> `optional` **filename?**: `string`

Defined in: [types/fileReference.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L113)

Override filename detection

---

### fileType?

> `optional` **fileType?**: [`FileType`](FileType.md)

Defined in: [types/fileReference.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L115)

Override file type detection

---

### mimetype?

> `optional` **mimetype?**: `string`

Defined in: [types/fileReference.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L124)

Caller-provided MIME type hint (e.g. "text/plain", "application/json").
Used when the filename has no extension and magic-byte detection cannot
identify the content (common for Slack/Curator-style buffers where the
original extension was stripped). Honored during type detection, mimeType
assignment, and filename-extension synthesis. An explicit `fileType`
override still wins over this hint.

---

### maxPreviewChars?

> `optional` **maxPreviewChars?**: `number`

Defined in: [types/fileReference.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L126)

Maximum preview length in characters

---

### skipTempPersist?

> `optional` **skipTempPersist?**: `boolean`

Defined in: [types/fileReference.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L128)

Skip persisting buffer to temp directory
