[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectedPII

# Type Alias: DetectedPII

> **DetectedPII** = `object`

## Properties

### type

> **type**: [`PiiType`](PiiType.md) \| `"custom"`

---

### value

> **value**: `string`

---

### position

> **position**: `object`

#### start

> **start**: `number`

#### end

> **end**: `number`

---

### field

> **field**: `string`

Which field the PII was found in (e.g. "text", "messages[2]")
