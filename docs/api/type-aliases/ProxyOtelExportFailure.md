[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Defined in: [types/proxy.ts:879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L879)

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L880)

---

### at

> **at**: `string`

Defined in: [types/proxy.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L881)

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

Defined in: [types/proxy.ts:882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L882)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L883)

---

### records

> **records**: `object`[]

Defined in: [types/proxy.ts:884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L884)

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
