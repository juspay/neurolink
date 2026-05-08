[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingProgressData

# Type Alias: StreamingProgressData

> **StreamingProgressData** = `object`

Defined in: [types/stream.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L35)

Progress tracking and metadata for streaming operations

## Properties

### chunkCount

> **chunkCount**: `number`

Defined in: [types/stream.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L36)

---

### totalBytes

> **totalBytes**: `number`

Defined in: [types/stream.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L37)

---

### chunkSize

> **chunkSize**: `number`

Defined in: [types/stream.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L38)

---

### elapsedTime

> **elapsedTime**: `number`

Defined in: [types/stream.ts:39](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L39)

---

### estimatedRemaining?

> `optional` **estimatedRemaining?**: `number`

Defined in: [types/stream.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L40)

---

### streamId?

> `optional` **streamId?**: `string`

Defined in: [types/stream.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L41)

---

### phase

> **phase**: `"initializing"` \| `"streaming"` \| `"processing"` \| `"complete"` \| `"error"`

Defined in: [types/stream.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L42)
