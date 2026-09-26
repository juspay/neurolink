[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarResult

# Type Alias: AvatarResult

> **AvatarResult** = `object`

Result of an avatar generation request.

## Properties

### buffer

> **buffer**: `Buffer`

Generated video buffer.

---

### format

> **format**: [`AvatarVideoFormat`](AvatarVideoFormat.md)

Output format.

---

### size

> **size**: `number`

File size in bytes.

---

### duration?

> `optional` **duration?**: `number`

Duration in seconds (when reported by the provider).

---

### provider?

> `optional` **provider?**: `string`

Provider used.

---

### metadata?

> `optional` **metadata?**: `object`

Performance / request metadata.

#### Index Signature

\[`key`: `string`\]: `unknown`

Any additional provider-specific metadata.

#### latency

> **latency**: `number`

Request latency in milliseconds.

#### provider?

> `optional` **provider?**: `string`

Provider name.

#### model?

> `optional` **model?**: `string`

Model variant used (when applicable).

#### jobId?

> `optional` **jobId?**: `string`

Job / talk identifier from the upstream.
