[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileDetectorOptions

# Type Alias: FileDetectorOptions

> **FileDetectorOptions** = `object`

Defined in: [types/file.ts:522](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L522)

File detector options

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/file.ts:523](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L523)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/file.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L524)

---

### allowedTypes?

> `optional` **allowedTypes?**: [`FileType`](FileType.md)[]

Defined in: [types/file.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L525)

---

### allowedBaseDir?

> `optional` **allowedBaseDir?**: `string`

Defined in: [types/file.ts:535](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L535)

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

Defined in: [types/file.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L536)

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/file.ts:537](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L537)

---

### officeOptions?

> `optional` **officeOptions?**: [`OfficeProcessorOptions`](OfficeProcessorOptions.md)

Defined in: [types/file.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L538)

---

### videoOptions?

> `optional` **videoOptions?**: [`VideoProcessorOptions`](VideoProcessorOptions.md)

Defined in: [types/file.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L539)

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Defined in: [types/file.ts:540](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L540)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L541)

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/file.ts:543](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L543)

Maximum number of retry attempts for network requests (default: 3)

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Defined in: [types/file.ts:545](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L545)

Initial retry delay in milliseconds with exponential backoff (default: 1000)

---

### mimetypeHint?

> `optional` **mimetypeHint?**: `string`

Defined in: [types/file.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L555)

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

Defined in: [types/file.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L566)

Caller-provided filename hint, the companion to [mimetypeHint](#mimetypehint).

The unified file path unwraps a `FileWithMetadata` to its `buffer` before
detection runs, so the object's `filename` is gone by the time extension
resolution looks for one — and TAR in particular cannot be identified any
other way, because its "ustar" marker sits at byte 257 rather than at
offset 0. Passing the name alongside the bytes keeps `.odp`, `.rtf` and
`.tar` routed to the processors that can actually read them.
