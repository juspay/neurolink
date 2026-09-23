[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Defined in: [types/proxy.ts:949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L949)

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L950)

---

### at

> **at**: `string`

Defined in: [types/proxy.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L951)

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

Defined in: [types/proxy.ts:952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L952)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L953)

---

### records

> **records**: `object`[]

Defined in: [types/proxy.ts:954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L954)

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
