[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Defined in: [types/proxy.ts:929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L929)

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L930)

---

### at

> **at**: `string`

Defined in: [types/proxy.ts:931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L931)

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

Defined in: [types/proxy.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L932)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L933)

---

### records

> **records**: `object`[]

Defined in: [types/proxy.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L934)

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
