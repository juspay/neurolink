[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanEvent

# Type Alias: SpanEvent

> **SpanEvent** = `object`

Span event for recording discrete occurrences

## Properties

### name

> **name**: `string`

---

### timestamp

> **timestamp**: `string`

---

### timestampUnixNano?

> `optional` **timestampUnixNano?**: `string`

When the event happened as nanoseconds since the Unix epoch (decimal string); finer than `timestamp`.

---

### attributes?

> `optional` **attributes?**: `Record`\<`string`, `unknown`\>
