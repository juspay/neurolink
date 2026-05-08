[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrecallEvaluationConfig

# Type Alias: PrecallEvaluationConfig

> **PrecallEvaluationConfig** = `object`

Defined in: [types/guardrails.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L55)

Configuration for precall evaluation using AI models

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/guardrails.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L56)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/guardrails.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L57)

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

Defined in: [types/guardrails.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L58)

---

### evaluationPrompt?

> `optional` **evaluationPrompt?**: `string`

Defined in: [types/guardrails.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L59)

---

### actions?

> `optional` **actions?**: [`EvaluationActions`](EvaluationActions.md)

Defined in: [types/guardrails.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L60)

---

### thresholds?

> `optional` **thresholds?**: [`EvaluationThresholds`](EvaluationThresholds.md)

Defined in: [types/guardrails.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L61)

---

### blockUnsafeRequests?

> `optional` **blockUnsafeRequests?**: `boolean`

Defined in: [types/guardrails.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L62)

---

### sanitizationPatterns?

> `optional` **sanitizationPatterns?**: `string`[]

Defined in: [types/guardrails.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L74)

Regex patterns to use for sanitizing input when action is "sanitize".
Each pattern will be applied with the 'gi' flags (global, case-insensitive).
Matched content will be replaced with the value specified in `replacementText`.

Example patterns:

- Email: '\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b'
- Phone: '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b'
- SSN: '\\b\\d{3}-\\d{2}-\\d{4}\\b'
- Custom words: '\\b(word1|word2|word3)\\b'

---

### replacementText?

> `optional` **replacementText?**: `string`

Defined in: [types/guardrails.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L85)

Text to use when replacing sanitized content.

#### Default

```ts
'[REDACTED]'

Examples:
- '[REDACTED]' (default)
- '***PRIVATE***'
- '####'
- '[FILTERED]'
```
