[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrecallEvaluationResult

# Type Alias: PrecallEvaluationResult

> **PrecallEvaluationResult** = `object`

Result from precall evaluation of user input

## Properties

### overall

> **overall**: `"safe"` \| `"unsafe"` \| `"suspicious"` \| `"inappropriate"`

---

### safetyScore

> **safetyScore**: `number`

---

### appropriatenessScore

> **appropriatenessScore**: `number`

---

### confidenceLevel

> **confidenceLevel**: `number`

---

### issues?

> `optional` **issues?**: `object`[]

#### category

> **category**: `"explicit_content"` \| `"hate_speech"` \| `"violence"` \| `"personal_info"` \| `"spam"` \| `"other"`

#### severity

> **severity**: `"low"` \| `"medium"` \| `"high"` \| `"critical"`

#### description

> **description**: `string`

---

### suggestedAction

> **suggestedAction**: `"allow"` \| `"block"` \| `"sanitize"` \| `"warn"`

---

### reasoning?

> `optional` **reasoning?**: `string`
