[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectedPII

# Type Alias: DetectedPII

> **DetectedPII** = `object`

Defined in: [types/ioProcessor.ts:35](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L35)

## Properties

### type

> **type**: [`PiiType`](PiiType.md) \| `"custom"`

Defined in: [types/ioProcessor.ts:36](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L36)

---

### value

> **value**: `string`

Defined in: [types/ioProcessor.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L37)

---

### position

> **position**: `object`

Defined in: [types/ioProcessor.ts:38](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L38)

#### start

> **start**: `number`

#### end

> **end**: `number`

---

### field

> **field**: `string`

Defined in: [types/ioProcessor.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L40)

Which field the PII was found in (e.g. "text", "messages[2]")
