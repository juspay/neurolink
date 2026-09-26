[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingProgressData

# Type Alias: StreamingProgressData

> **StreamingProgressData** = `object`

Defined in: [types/stream.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L52)

Progress tracking and metadata for streaming operations

## Properties

### chunkCount

> **chunkCount**: `number`

Defined in: [types/stream.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L53)

---

### totalBytes

> **totalBytes**: `number`

Defined in: [types/stream.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L54)

---

### chunkSize

> **chunkSize**: `number`

Defined in: [types/stream.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L55)

---

### elapsedTime

> **elapsedTime**: `number`

Defined in: [types/stream.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L56)

---

### estimatedRemaining?

> `optional` **estimatedRemaining?**: `number`

Defined in: [types/stream.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L57)

---

### streamId?

> `optional` **streamId?**: `string`

Defined in: [types/stream.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L58)

---

### phase

> **phase**: `"initializing"` \| `"streaming"` \| `"processing"` \| `"complete"` \| `"error"`

Defined in: [types/stream.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L59)
