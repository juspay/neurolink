[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingProgressData

# Type Alias: StreamingProgressData

> **StreamingProgressData** = `object`

Defined in: [types/stream.ts:46](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L46)

Progress tracking and metadata for streaming operations

## Properties

### chunkCount

> **chunkCount**: `number`

Defined in: [types/stream.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L47)

---

### totalBytes

> **totalBytes**: `number`

Defined in: [types/stream.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L48)

---

### chunkSize

> **chunkSize**: `number`

Defined in: [types/stream.ts:49](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L49)

---

### elapsedTime

> **elapsedTime**: `number`

Defined in: [types/stream.ts:50](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L50)

---

### estimatedRemaining?

> `optional` **estimatedRemaining?**: `number`

Defined in: [types/stream.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L51)

---

### streamId?

> `optional` **streamId?**: `string`

Defined in: [types/stream.ts:52](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L52)

---

### phase

> **phase**: `"initializing"` \| `"streaming"` \| `"processing"` \| `"complete"` \| `"error"`

Defined in: [types/stream.ts:53](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L53)
