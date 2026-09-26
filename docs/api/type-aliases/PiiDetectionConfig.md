[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PiiDetectionConfig

# Type Alias: PiiDetectionConfig

> **PiiDetectionConfig** = `object`

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

---

### action

> **action**: `"redact"` \| `"abort"` \| `"warn"`

---

### detectTypes?

> `optional` **detectTypes?**: [`PiiType`](PiiType.md)[]

---

### customPatterns?

> `optional` **customPatterns?**: `RegExp`[]

---

### allowList?

> `optional` **allowList?**: `string`[]

---

### redactionText?

> `optional` **redactionText?**: `string`
