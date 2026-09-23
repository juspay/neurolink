[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyDeliveryResult

# Type Alias: ProxyBodyDeliveryResult

> **ProxyBodyDeliveryResult** = `object`

Defined in: [types/proxy.ts:851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L851)

Collector transport evidence; acknowledgement does not prove backend storage.

## Properties

### status

> **status**: `"transport_acknowledged"` \| `"export_unconfirmed"` \| `"rejected"` \| `"partial"`

Defined in: [types/proxy.ts:852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L852)

---

### expectedChunks?

> `optional` **expectedChunks?**: `number`

Defined in: [types/proxy.ts:858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L858)

Absent when publication was rejected before chunking.

---

### acknowledgedChunks

> **acknowledgedChunks**: `number`

Defined in: [types/proxy.ts:859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L859)

---

### unconfirmedChunks

> **unconfirmedChunks**: `number`

Defined in: [types/proxy.ts:860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L860)

---

### droppedChunks

> **droppedChunks**: `number`

Defined in: [types/proxy.ts:861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L861)

---

### notSubmittedChunks?

> `optional` **notSubmittedChunks?**: `number`

Defined in: [types/proxy.ts:862](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L862)

---

### publicationMs?

> `optional` **publicationMs?**: `number`

Defined in: [types/proxy.ts:864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L864)

Total publication elapsed time, including capacity and exporter waits.

---

### capacityWaitMs?

> `optional` **capacityWaitMs?**: `number`

Defined in: [types/proxy.ts:865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L865)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L867)

Maximum per-chunk residence before an OTLP export starts.

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L869)

Maximum per-chunk transport duration; never sums overlapping exports.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L870)
