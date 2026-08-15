[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PiiDetectionResult

# Type Alias: PiiDetectionResult

> **PiiDetectionResult** = `object`

Defined in: [types/ioProcessor.ts:43](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L43)

## Properties

### text

> **text**: `string`

Defined in: [types/ioProcessor.ts:45](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L45)

Redacted text when action=redact, otherwise the original text

---

### detectedPII

> **detectedPII**: [`DetectedPII`](DetectedPII.md)[]

Defined in: [types/ioProcessor.ts:46](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L46)

---

### action

> **action**: `"continue"` \| `"abort"`

Defined in: [types/ioProcessor.ts:47](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L47)

---

### feedback?

> `optional` **feedback?**: `string`

Defined in: [types/ioProcessor.ts:49](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L49)

Human-readable message about what was found
