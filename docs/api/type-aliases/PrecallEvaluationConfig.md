[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrecallEvaluationConfig

# Type Alias: PrecallEvaluationConfig

> **PrecallEvaluationConfig** = `object`

Configuration for precall evaluation using AI models

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

---

### provider?

> `optional` **provider?**: `string`

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

---

### evaluationPrompt?

> `optional` **evaluationPrompt?**: `string`

---

### actions?

> `optional` **actions?**: [`EvaluationActions`](EvaluationActions.md)

---

### thresholds?

> `optional` **thresholds?**: [`EvaluationThresholds`](EvaluationThresholds.md)

---

### blockUnsafeRequests?

> `optional` **blockUnsafeRequests?**: `boolean`

---

### sanitizationPatterns?

> `optional` **sanitizationPatterns?**: `string`[]

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
