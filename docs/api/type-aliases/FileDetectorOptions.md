[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileDetectorOptions

# Type Alias: FileDetectorOptions

> **FileDetectorOptions** = `object`

Defined in: [types/file.ts:518](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L518)

File detector options

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/file.ts:519](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L519)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/file.ts:520](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L520)

---

### allowedTypes?

> `optional` **allowedTypes?**: [`FileType`](FileType.md)[]

Defined in: [types/file.ts:521](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L521)

---

### allowedBaseDir?

> `optional` **allowedBaseDir?**: `string`

Defined in: [types/file.ts:531](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L531)

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

Defined in: [types/file.ts:532](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L532)

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/file.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L533)

---

### officeOptions?

> `optional` **officeOptions?**: [`OfficeProcessorOptions`](OfficeProcessorOptions.md)

Defined in: [types/file.ts:534](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L534)

---

### videoOptions?

> `optional` **videoOptions?**: [`VideoProcessorOptions`](VideoProcessorOptions.md)

Defined in: [types/file.ts:535](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L535)

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Defined in: [types/file.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L536)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:537](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L537)

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/file.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L539)

Maximum number of retry attempts for network requests (default: 3)

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Defined in: [types/file.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L541)

Initial retry delay in milliseconds with exponential backoff (default: 1000)

---

### mimetypeHint?

> `optional` **mimetypeHint?**: `string`

Defined in: [types/file.ts:551](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L551)

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

Defined in: [types/file.ts:562](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L562)

Caller-provided filename hint, the companion to [mimetypeHint](#mimetypehint).

The unified file path unwraps a `FileWithMetadata` to its `buffer` before
detection runs, so the object's `filename` is gone by the time extension
resolution looks for one — and TAR in particular cannot be identified any
other way, because its "ustar" marker sits at byte 257 rather than at
offset 0. Passing the name alongside the bytes keeps `.odp`, `.rtf` and
`.tar` routed to the processors that can actually read them.
