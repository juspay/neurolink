[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyDeliveryResult

# Type Alias: ProxyBodyDeliveryResult

> **ProxyBodyDeliveryResult** = `object`

Defined in: [types/proxy.ts:871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L871)

Collector transport evidence; acknowledgement does not prove backend storage.

## Properties

### status

> **status**: `"transport_acknowledged"` \| `"export_unconfirmed"` \| `"rejected"` \| `"partial"`

Defined in: [types/proxy.ts:872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L872)

---

### expectedChunks?

> `optional` **expectedChunks?**: `number`

Defined in: [types/proxy.ts:878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L878)

Absent when publication was rejected before chunking.

---

### acknowledgedChunks

> **acknowledgedChunks**: `number`

Defined in: [types/proxy.ts:879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L879)

---

### unconfirmedChunks

> **unconfirmedChunks**: `number`

Defined in: [types/proxy.ts:880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L880)

---

### droppedChunks

> **droppedChunks**: `number`

Defined in: [types/proxy.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L881)

---

### notSubmittedChunks?

> `optional` **notSubmittedChunks?**: `number`

Defined in: [types/proxy.ts:882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L882)

---

### publicationMs?

> `optional` **publicationMs?**: `number`

Defined in: [types/proxy.ts:884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L884)

Total publication elapsed time, including capacity and exporter waits.

---

### capacityWaitMs?

> `optional` **capacityWaitMs?**: `number`

Defined in: [types/proxy.ts:885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L885)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L887)

Maximum per-chunk residence before an OTLP export starts.

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L889)

Maximum per-chunk transport duration; never sums overlapping exports.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L890)
