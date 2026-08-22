[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarResult

# Type Alias: AvatarResult

> **AvatarResult** = `object`

Defined in: [types/avatar.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L87)

Result of an avatar generation request.

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/avatar.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L89)

Generated video buffer.

---

### format

> **format**: [`AvatarVideoFormat`](AvatarVideoFormat.md)

Defined in: [types/avatar.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L91)

Output format.

---

### size

> **size**: `number`

Defined in: [types/avatar.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L93)

File size in bytes.

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/avatar.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L95)

Duration in seconds (when reported by the provider).

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/avatar.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L97)

Provider used.

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/avatar.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L99)

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
