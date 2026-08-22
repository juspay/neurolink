[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectedPII

# Type Alias: DetectedPII

> **DetectedPII** = `object`

Defined in: [types/ioProcessor.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L35)

## Properties

### type

> **type**: [`PiiType`](PiiType.md) \| `"custom"`

Defined in: [types/ioProcessor.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L36)

---

### value

> **value**: `string`

Defined in: [types/ioProcessor.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L37)

---

### position

> **position**: `object`

Defined in: [types/ioProcessor.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L38)

#### start

> **start**: `number`

#### end

> **end**: `number`

---

### field

> **field**: `string`

Defined in: [types/ioProcessor.ts:40](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L40)

Which field the PII was found in (e.g. "text", "messages[2]")
