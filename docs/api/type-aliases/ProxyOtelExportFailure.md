[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Defined in: [types/proxy.ts:1001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1001)

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1002)

---

### at

> **at**: `string`

Defined in: [types/proxy.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1003)

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

Defined in: [types/proxy.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1004)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1005)

---

### records

> **records**: `object`[]

Defined in: [types/proxy.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1006)

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
