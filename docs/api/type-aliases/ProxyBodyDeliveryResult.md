[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyDeliveryResult

# Type Alias: ProxyBodyDeliveryResult

> **ProxyBodyDeliveryResult** = `object`

Defined in: [types/proxy.ts:797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L797)

Collector transport evidence; acknowledgement does not prove backend storage.

## Properties

### status

> **status**: `"transport_acknowledged"` \| `"export_unconfirmed"` \| `"rejected"` \| `"partial"`

Defined in: [types/proxy.ts:798](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L798)

---

### expectedChunks?

> `optional` **expectedChunks?**: `number`

Defined in: [types/proxy.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L804)

Absent when publication was rejected before chunking.

---

### acknowledgedChunks

> **acknowledgedChunks**: `number`

Defined in: [types/proxy.ts:805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L805)

---

### unconfirmedChunks

> **unconfirmedChunks**: `number`

Defined in: [types/proxy.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L806)

---

### droppedChunks

> **droppedChunks**: `number`

Defined in: [types/proxy.ts:807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L807)

---

### notSubmittedChunks?

> `optional` **notSubmittedChunks?**: `number`

Defined in: [types/proxy.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L808)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L809)
