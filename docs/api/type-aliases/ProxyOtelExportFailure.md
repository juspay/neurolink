[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Defined in: [types/proxy.ts:822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L822)

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L823)

---

### at

> **at**: `string`

Defined in: [types/proxy.ts:824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L824)

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

Defined in: [types/proxy.ts:825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L825)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L826)

---

### records

> **records**: `object`[]

Defined in: [types/proxy.ts:827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L827)

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
