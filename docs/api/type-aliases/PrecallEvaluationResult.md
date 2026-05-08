[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrecallEvaluationResult

# Type Alias: PrecallEvaluationResult

> **PrecallEvaluationResult** = `object`

Defined in: [types/guardrails.ts:6](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L6)

Result from precall evaluation of user input

## Properties

### overall

> **overall**: `"safe"` \| `"unsafe"` \| `"suspicious"` \| `"inappropriate"`

Defined in: [types/guardrails.ts:7](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L7)

---

### safetyScore

> **safetyScore**: `number`

Defined in: [types/guardrails.ts:8](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L8)

---

### appropriatenessScore

> **appropriatenessScore**: `number`

Defined in: [types/guardrails.ts:9](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L9)

---

### confidenceLevel

> **confidenceLevel**: `number`

Defined in: [types/guardrails.ts:10](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L10)

---

### issues?

> `optional` **issues?**: `object`[]

Defined in: [types/guardrails.ts:11](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L11)

#### category

> **category**: `"explicit_content"` \| `"hate_speech"` \| `"violence"` \| `"personal_info"` \| `"spam"` \| `"other"`

#### severity

> **severity**: `"low"` \| `"medium"` \| `"high"` \| `"critical"`

#### description

> **description**: `string`

---

### suggestedAction

> **suggestedAction**: `"allow"` \| `"block"` \| `"sanitize"` \| `"warn"`

Defined in: [types/guardrails.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L22)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/guardrails.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L23)
