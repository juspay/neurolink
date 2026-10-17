[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAgentRouteOptions

# Type Alias: ServerAgentRouteOptions

> **ServerAgentRouteOptions** = `object`

Options for `createAgentRoutes()`.

## Properties

### allowedInputRoots?

> `optional` **allowedInputRoots?**: `string`[]

Directories a request's `input.images` / `input.files` entries may name as
local paths. Empty or omitted (the default) refuses every local path: a
server must not read its own disk on a caller's say-so unless the operator
names where.

---

### maxInputBytes?

> `optional` **maxInputBytes?**: `number`

Largest single attachment accepted, in bytes. Default 50 MiB. A `data:` URI
is measured by its string length. When `maxInputTotalBytes` is set lower,
the smaller of the two is the per-attachment cap.

---

### maxInputAttachments?

> `optional` **maxInputAttachments?**: `number`

Most attachments one request may carry, `input.images` and `input.files`
counted together. Default 20. A longer list is refused with 413 before any
attachment is read or downloaded.

---

### maxInputTotalBytes?

> `optional` **maxInputTotalBytes?**: `number`

Largest sum of all attachments of one request, in bytes: images and files
share this one budget, and a `data:` URI is charged its string length.
Default 100 MiB. A request that overflows it is refused with 413, and a
file or download that would overflow it stops mid-transfer.
