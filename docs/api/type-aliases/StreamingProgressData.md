[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingProgressData

# Type Alias: StreamingProgressData

> **StreamingProgressData** = `object`

Defined in: [types/stream.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L56)

Progress tracking and metadata for streaming operations

## Properties

### chunkCount

> **chunkCount**: `number`

Defined in: [types/stream.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L57)

---

### totalBytes

> **totalBytes**: `number`

Defined in: [types/stream.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L58)

---

### chunkSize

> **chunkSize**: `number`

Defined in: [types/stream.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L59)

---

### elapsedTime

> **elapsedTime**: `number`

Defined in: [types/stream.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L60)

---

### estimatedRemaining?

> `optional` **estimatedRemaining?**: `number`

Defined in: [types/stream.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L61)

---

### streamId?

> `optional` **streamId?**: `string`

Defined in: [types/stream.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L62)

---

### phase

> **phase**: `"initializing"` \| `"streaming"` \| `"processing"` \| `"complete"` \| `"error"`

Defined in: [types/stream.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L63)
