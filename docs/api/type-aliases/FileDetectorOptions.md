[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileDetectorOptions

# Type Alias: FileDetectorOptions

> **FileDetectorOptions** = `object`

Defined in: [types/file.ts:733](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L733)

File detector options

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/file.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L734)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/file.ts:735](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L735)

---

### allowedTypes?

> `optional` **allowedTypes?**: [`FileType`](FileType.md)[]

Defined in: [types/file.ts:736](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L736)

---

### allowedBaseDir?

> `optional` **allowedBaseDir?**: `string`

Defined in: [types/file.ts:746](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L746)

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

Defined in: [types/file.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L747)

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/file.ts:748](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L748)

---

### officeOptions?

> `optional` **officeOptions?**: [`OfficeProcessorOptions`](OfficeProcessorOptions.md)

Defined in: [types/file.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L749)

---

### videoOptions?

> `optional` **videoOptions?**: [`VideoProcessorOptions`](VideoProcessorOptions.md)

Defined in: [types/file.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L750)

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Defined in: [types/file.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L751)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L752)

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/file.ts:754](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L754)

Maximum number of retry attempts for network requests (default: 3)

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Defined in: [types/file.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L756)

Initial retry delay in milliseconds with exponential backoff (default: 1000)

---

### mimetypeHint?

> `optional` **mimetypeHint?**: `string`

Defined in: [types/file.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L766)

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

Defined in: [types/file.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L777)

Caller-provided filename hint, the companion to [mimetypeHint](#mimetypehint).

The unified file path unwraps a `FileWithMetadata` to its `buffer` before
detection runs, so the object's `filename` is gone by the time extension
resolution looks for one — and TAR in particular cannot be identified any
other way, because its "ustar" marker sits at byte 257 rather than at
offset 0. Passing the name alongside the bytes keeps `.odp`, `.rtf` and
`.tar` routed to the processors that can actually read them.
