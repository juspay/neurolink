[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileDetectorOptions

# Type Alias: FileDetectorOptions

> **FileDetectorOptions** = `object`

File detector options

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

---

### timeout?

> `optional` **timeout?**: `number`

---

### allowedTypes?

> `optional` **allowedTypes?**: [`FileType`](FileType.md)[]

---

### allowedBaseDir?

> `optional` **allowedBaseDir?**: `string`

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

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

---

### officeOptions?

> `optional` **officeOptions?**: [`OfficeProcessorOptions`](OfficeProcessorOptions.md)

---

### videoOptions?

> `optional` **videoOptions?**: [`VideoProcessorOptions`](VideoProcessorOptions.md)

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

---

### provider?

> `optional` **provider?**: `string`

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Maximum number of retry attempts for network requests (default: 3)

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Initial retry delay in milliseconds with exponential backoff (default: 1000)

---

### mimetypeHint?

> `optional` **mimetypeHint?**: `string`

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

Caller-provided filename hint, the companion to [mimetypeHint](#mimetypehint).

The unified file path unwraps a `FileWithMetadata` to its `buffer` before
detection runs, so the object's `filename` is gone by the time extension
resolution looks for one — and TAR in particular cannot be identified any
other way, because its "ustar" marker sits at byte 257 rather than at
offset 0. Passing the name alongside the bytes keeps `.odp`, `.rtf` and
`.tar` routed to the processors that can actually read them.
