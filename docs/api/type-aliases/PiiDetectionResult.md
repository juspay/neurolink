[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PiiDetectionResult

# Type Alias: PiiDetectionResult

> **PiiDetectionResult** = `object`

## Properties

### text

> **text**: `string`

Redacted text when action=redact, otherwise the original text

---

### detectedPII

> **detectedPII**: [`DetectedPII`](DetectedPII.md)[]

---

### action

> **action**: `"continue"` \| `"abort"`

---

### feedback?

> `optional` **feedback?**: `string`

Human-readable message about what was found
