[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyDeliveryResult

# Type Alias: ProxyBodyDeliveryResult

> **ProxyBodyDeliveryResult** = `object`

Collector transport evidence; acknowledgement does not prove backend storage.

## Properties

### status

> **status**: `"transport_acknowledged"` \| `"export_unconfirmed"` \| `"rejected"` \| `"partial"`

---

### expectedChunks?

> `optional` **expectedChunks?**: `number`

Absent when publication was rejected before chunking.

---

### acknowledgedChunks

> **acknowledgedChunks**: `number`

---

### unconfirmedChunks

> **unconfirmedChunks**: `number`

---

### droppedChunks

> **droppedChunks**: `number`

---

### notSubmittedChunks?

> `optional` **notSubmittedChunks?**: `number`

---

### publicationMs?

> `optional` **publicationMs?**: `number`

Total publication elapsed time, including capacity and exporter waits.

---

### capacityWaitMs?

> `optional` **capacityWaitMs?**: `number`

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Maximum per-chunk residence before an OTLP export starts.

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Maximum per-chunk transport duration; never sums overlapping exports.

---

### reason?

> `optional` **reason?**: `string`
