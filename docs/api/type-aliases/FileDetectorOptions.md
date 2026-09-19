[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileDetectorOptions

# Type Alias: FileDetectorOptions

> **FileDetectorOptions** = `object`

Defined in: [types/file.ts:605](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L605)

File detector options

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/file.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L606)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/file.ts:607](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L607)

---

### allowedTypes?

> `optional` **allowedTypes?**: [`FileType`](FileType.md)[]

Defined in: [types/file.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L608)

---

### allowedBaseDir?

> `optional` **allowedBaseDir?**: `string`

Defined in: [types/file.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L618)

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

Defined in: [types/file.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L619)

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/file.ts:620](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L620)

---

### officeOptions?

> `optional` **officeOptions?**: [`OfficeProcessorOptions`](OfficeProcessorOptions.md)

Defined in: [types/file.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L621)

---

### videoOptions?

> `optional` **videoOptions?**: [`VideoProcessorOptions`](VideoProcessorOptions.md)

Defined in: [types/file.ts:622](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L622)

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Defined in: [types/file.ts:623](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L623)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:624](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L624)

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/file.ts:626](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L626)

Maximum number of retry attempts for network requests (default: 3)

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Defined in: [types/file.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L628)

Initial retry delay in milliseconds with exponential backoff (default: 1000)

---

### mimetypeHint?

> `optional` **mimetypeHint?**: `string`

Defined in: [types/file.ts:638](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L638)

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

Defined in: [types/file.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L649)

Caller-provided filename hint, the companion to [mimetypeHint](#mimetypehint).

The unified file path unwraps a `FileWithMetadata` to its `buffer` before
detection runs, so the object's `filename` is gone by the time extension
resolution looks for one — and TAR in particular cannot be identified any
other way, because its "ustar" marker sits at byte 257 rather than at
offset 0. Passing the name alongside the bytes keeps `.odp`, `.rtf` and
`.tar` routed to the processors that can actually read them.
