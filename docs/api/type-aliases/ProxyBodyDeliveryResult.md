[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyDeliveryResult

# Type Alias: ProxyBodyDeliveryResult

> **ProxyBodyDeliveryResult** = `object`

Defined in: [types/proxy.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L923)

Collector transport evidence; acknowledgement does not prove backend storage.

## Properties

### status

> **status**: `"transport_acknowledged"` \| `"export_unconfirmed"` \| `"rejected"` \| `"partial"`

Defined in: [types/proxy.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L924)

---

### expectedChunks?

> `optional` **expectedChunks?**: `number`

Defined in: [types/proxy.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L930)

Absent when publication was rejected before chunking.

---

### acknowledgedChunks

> **acknowledgedChunks**: `number`

Defined in: [types/proxy.ts:931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L931)

---

### unconfirmedChunks

> **unconfirmedChunks**: `number`

Defined in: [types/proxy.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L932)

---

### droppedChunks

> **droppedChunks**: `number`

Defined in: [types/proxy.ts:933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L933)

---

### notSubmittedChunks?

> `optional` **notSubmittedChunks?**: `number`

Defined in: [types/proxy.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L934)

---

### publicationMs?

> `optional` **publicationMs?**: `number`

Defined in: [types/proxy.ts:936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L936)

Total publication elapsed time, including capacity and exporter waits.

---

### capacityWaitMs?

> `optional` **capacityWaitMs?**: `number`

Defined in: [types/proxy.ts:937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L937)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L939)

Maximum per-chunk residence before an OTLP export starts.

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L941)

Maximum per-chunk transport duration; never sums overlapping exports.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L942)
