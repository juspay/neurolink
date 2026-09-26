[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseValidationConfig

# Type Alias: ResponseValidationConfig

> **ResponseValidationConfig** = `object`

## Properties

### minLength?

> `optional` **minLength?**: `number`

Minimum required character length for the response

---

### maxLength?

> `optional` **maxLength?**: `number`

Maximum allowed character length for the response

---

### requiredPhrases?

> `optional` **requiredPhrases?**: `string`[]

Phrases that must appear in the response (case-insensitive)

---

### forbiddenPhrases?

> `optional` **forbiddenPhrases?**: `string`[]

Phrases that must NOT appear in the response (case-insensitive)

---

### jsonSchema?

> `optional` **jsonSchema?**: `Record`\<`string`, `unknown`\>

JSON Schema to validate the response against (response must be valid JSON)

---

### customValidator?

> `optional` **customValidator?**: (`text`) => [`ValidationIssue`](ValidationIssue.md) \| `null`

Custom validation function; return a ValidationIssue to signal failure, null to pass

#### Parameters

##### text

`string`

#### Returns

[`ValidationIssue`](ValidationIssue.md) \| `null`

---

### truncationAction?

> `optional` **truncationAction?**: `"abort"` \| `"retry"` \| `"truncate"` \| `"warn"`

Action to take when maxLength is exceeded:

- "truncate" — slice text to maxLength + suffix (default)
- "abort" — return action:"abort"
- "retry" — return action:"retry" with feedback
- "warn" — log a warning but return the unmodified text

---

### truncationSuffix?

> `optional` **truncationSuffix?**: `string`

Suffix appended when truncating (default: "..."). Never causes the final string to exceed maxLength.

---

### retryOnFailure?

> `optional` **retryOnFailure?**: `boolean`

Return action:"retry" when any error-severity issue is found

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Maximum allowed retry count (informational — caller enforces the loop)
