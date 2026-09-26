[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyOtelExportFailure

# Type Alias: ProxyOtelExportFailure

> **ProxyOtelExportFailure** = `object`

Bounded metadata-only evidence for an unconfirmed or locally rejected OTLP batch.

## Properties

### id

> **id**: `string`

---

### at

> **at**: `string`

---

### reason

> **reason**: `"export_unconfirmed"` \| `"queue_full"`

---

### error?

> `optional` **error?**: `string`

---

### records

> **records**: `object`[]

#### eventId

> **eventId**: `string`

#### kind?

> `optional` **kind?**: `string`

#### requestId?

> `optional` **requestId?**: `string`

#### captureId?

> `optional` **captureId?**: `string`
