[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PiiDetectionResult

# Type Alias: PiiDetectionResult

> **PiiDetectionResult** = `object`

Defined in: [types/ioProcessor.ts:43](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L43)

## Properties

### text

> **text**: `string`

Defined in: [types/ioProcessor.ts:45](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L45)

Redacted text when action=redact, otherwise the original text

---

### detectedPII

> **detectedPII**: [`DetectedPII`](DetectedPII.md)[]

Defined in: [types/ioProcessor.ts:46](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L46)

---

### action

> **action**: `"continue"` \| `"abort"`

Defined in: [types/ioProcessor.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L47)

---

### feedback?

> `optional` **feedback?**: `string`

Defined in: [types/ioProcessor.ts:49](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L49)

Human-readable message about what was found
