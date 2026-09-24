[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Defined in: [types/proxy.ts:1010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1010)

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1011)

---

### at

> **at**: `string`

Defined in: [types/proxy.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1012)

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

Defined in: [types/proxy.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1013)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1014)

---

### records

> **records**: `object`[]

Defined in: [types/proxy.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1015)

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
