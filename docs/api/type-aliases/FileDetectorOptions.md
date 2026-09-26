[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileDetectorOptions

# Type Alias: FileDetectorOptions

> **FileDetectorOptions** = `object`

Defined in: [types/file.ts:625](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L625)

File detector options

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/file.ts:626](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L626)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/file.ts:627](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L627)

---

### allowedTypes?

> `optional` **allowedTypes?**: [`FileType`](FileType.md)[]

Defined in: [types/file.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L628)

---

### allowedBaseDir?

> `optional` **allowedBaseDir?**: `string`

Defined in: [types/file.ts:638](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L638)

When set, local file paths must resolve inside this base directory;
anything that escapes it (absolute path, `../` traversal, or a symlink
pointing outside) is rejected. Containment is enforced on the real,
symlink-resolved path of both the base dir and the target, so a symlink
inside the base cannot be used to reach a file outside it. Servers that
accept file paths from untrusted callers should set this to sandbox
filesystem access; SDK callers loading their own files can omit it.

---

### audioOptions?

> `optional` **audioOptions?**: [`AudioProcessorOptions`](AudioProcessorOptions.md)

Defined in: [types/file.ts:639](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L639)

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/file.ts:640](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L640)

---

### officeOptions?

> `optional` **officeOptions?**: [`OfficeProcessorOptions`](OfficeProcessorOptions.md)

Defined in: [types/file.ts:641](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L641)

---

### videoOptions?

> `optional` **videoOptions?**: [`VideoProcessorOptions`](VideoProcessorOptions.md)

Defined in: [types/file.ts:642](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L642)

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Defined in: [types/file.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L643)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L644)

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/file.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L646)

Maximum number of retry attempts for network requests (default: 3)

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Defined in: [types/file.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L648)

Initial retry delay in milliseconds with exponential backoff (default: 1000)

---

### mimetypeHint?

> `optional` **mimetypeHint?**: `string`

Defined in: [types/file.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L658)

Caller-provided MIME type hint (e.g. "text/plain", "application/json").
Used when the filename has no extension and magic-byte detection cannot
identify the content — the common Slack/Curator extension-less-buffer
case. When set to a trustworthy mimetype (not "application/octet-stream"),
it short-circuits the detection strategy loop with a high-confidence
result so small files on the eager file-processing path still honor the
hint (the lazy FileReferenceRegistry path has its own hint-handling).

---

### filenameHint?

> `optional` **filenameHint?**: `string`

Defined in: [types/file.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L669)

Caller-provided filename hint, the companion to [mimetypeHint](#mimetypehint).

The unified file path unwraps a `FileWithMetadata` to its `buffer` before
detection runs, so the object's `filename` is gone by the time extension
resolution looks for one — and TAR in particular cannot be identified any
other way, because its "ustar" marker sits at byte 257 rather than at
offset 0. Passing the name alongside the bytes keeps `.odp`, `.rtf` and
`.tar` routed to the processors that can actually read them.
