[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Defined in: [types/proxy.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L818)

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L819)

---

### at

> **at**: `string`

Defined in: [types/proxy.ts:820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L820)

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

Defined in: [types/proxy.ts:821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L821)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L822)

---

### records

> **records**: `object`[]

Defined in: [types/proxy.ts:823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L823)

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
