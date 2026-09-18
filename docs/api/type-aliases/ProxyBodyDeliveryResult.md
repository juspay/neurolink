[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyDeliveryResult

# Type Alias: ProxyBodyDeliveryResult

> **ProxyBodyDeliveryResult** = `object`

Defined in: [types/proxy.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L804)

Collector transport evidence; acknowledgement does not prove backend storage.

## Properties

### status

> **status**: `"transport_acknowledged"` \| `"export_unconfirmed"` \| `"rejected"` \| `"partial"`

Defined in: [types/proxy.ts:805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L805)

---

### expectedChunks?

> `optional` **expectedChunks?**: `number`

Defined in: [types/proxy.ts:811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L811)

Absent when publication was rejected before chunking.

---

### acknowledgedChunks

> **acknowledgedChunks**: `number`

Defined in: [types/proxy.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L812)

---

### unconfirmedChunks

> **unconfirmedChunks**: `number`

Defined in: [types/proxy.ts:813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L813)

---

### droppedChunks

> **droppedChunks**: `number`

Defined in: [types/proxy.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L814)

---

### notSubmittedChunks?

> `optional` **notSubmittedChunks?**: `number`

Defined in: [types/proxy.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L815)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L816)
