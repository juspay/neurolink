[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Defined in: [types/proxy.ts:829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L829)

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L830)

---

### at

> **at**: `string`

Defined in: [types/proxy.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L831)

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

Defined in: [types/proxy.ts:832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L832)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L833)

---

### records

> **records**: `object`[]

Defined in: [types/proxy.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L834)

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
