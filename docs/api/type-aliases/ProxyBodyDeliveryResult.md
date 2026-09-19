[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyDeliveryResult

# Type Alias: ProxyBodyDeliveryResult

> **ProxyBodyDeliveryResult** = `object`

Defined in: [types/proxy.ts:845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L845)

Collector transport evidence; acknowledgement does not prove backend storage.

## Properties

### status

> **status**: `"transport_acknowledged"` \| `"export_unconfirmed"` \| `"rejected"` \| `"partial"`

Defined in: [types/proxy.ts:846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L846)

---

### expectedChunks?

> `optional` **expectedChunks?**: `number`

Defined in: [types/proxy.ts:852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L852)

Absent when publication was rejected before chunking.

---

### acknowledgedChunks

> **acknowledgedChunks**: `number`

Defined in: [types/proxy.ts:853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L853)

---

### unconfirmedChunks

> **unconfirmedChunks**: `number`

Defined in: [types/proxy.ts:854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L854)

---

### droppedChunks

> **droppedChunks**: `number`

Defined in: [types/proxy.ts:855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L855)

---

### notSubmittedChunks?

> `optional` **notSubmittedChunks?**: `number`

Defined in: [types/proxy.ts:856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L856)

---

### publicationMs?

> `optional` **publicationMs?**: `number`

Defined in: [types/proxy.ts:858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L858)

Total publication elapsed time, including capacity and exporter waits.

---

### capacityWaitMs?

> `optional` **capacityWaitMs?**: `number`

Defined in: [types/proxy.ts:859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L859)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L861)

Maximum per-chunk residence before an OTLP export starts.

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:863](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L863)

Maximum per-chunk transport duration; never sums overlapping exports.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L864)
