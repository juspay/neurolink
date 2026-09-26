[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtelSpan

# Type Alias: OtelSpan

> **OtelSpan** = `object`

OpenTelemetry span format

## Properties

### traceId

> **traceId**: `string`

---

### spanId

> **spanId**: `string`

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

---

### name

> **name**: `string`

---

### kind

> **kind**: `number`

---

### startTimeUnixNano

> **startTimeUnixNano**: `number`

---

### endTimeUnixNano?

> `optional` **endTimeUnixNano?**: `number`

---

### attributes

> **attributes**: `object`[]

#### key

> **key**: `string`

#### value

> **value**: `object`

##### value.stringValue?

> `optional` **stringValue?**: `string`

##### value.intValue?

> `optional` **intValue?**: `number`

##### value.boolValue?

> `optional` **boolValue?**: `boolean`

---

### status

> **status**: `object`

#### code

> **code**: `number`

#### message?

> `optional` **message?**: `string`

---

### events

> **events**: `object`[]

#### name

> **name**: `string`

#### timeUnixNano

> **timeUnixNano**: `number`

#### attributes

> **attributes**: `object`[]
