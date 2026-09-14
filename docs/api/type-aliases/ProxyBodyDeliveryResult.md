[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyDeliveryResult

# Type Alias: ProxyBodyDeliveryResult

> **ProxyBodyDeliveryResult** = `object`

Defined in: [types/proxy.ts:793](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L793)

Collector transport evidence; acknowledgement does not prove backend storage.

## Properties

### status

> **status**: `"transport_acknowledged"` \| `"export_unconfirmed"` \| `"rejected"` \| `"partial"`

Defined in: [types/proxy.ts:794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L794)

---

### expectedChunks?

> `optional` **expectedChunks?**: `number`

Defined in: [types/proxy.ts:800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L800)

Absent when publication was rejected before chunking.

---

### acknowledgedChunks

> **acknowledgedChunks**: `number`

Defined in: [types/proxy.ts:801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L801)

---

### unconfirmedChunks

> **unconfirmedChunks**: `number`

Defined in: [types/proxy.ts:802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L802)

---

### droppedChunks

> **droppedChunks**: `number`

Defined in: [types/proxy.ts:803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L803)

---

### notSubmittedChunks?

> `optional` **notSubmittedChunks?**: `number`

Defined in: [types/proxy.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L804)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L805)
