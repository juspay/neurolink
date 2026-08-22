[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseValidationConfig

# Type Alias: ResponseValidationConfig

> **ResponseValidationConfig** = `object`

Defined in: [types/ioProcessor.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L56)

## Properties

### minLength?

> `optional` **minLength?**: `number`

Defined in: [types/ioProcessor.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L58)

Minimum required character length for the response

---

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/ioProcessor.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L60)

Maximum allowed character length for the response

---

### requiredPhrases?

> `optional` **requiredPhrases?**: `string`[]

Defined in: [types/ioProcessor.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L62)

Phrases that must appear in the response (case-insensitive)

---

### forbiddenPhrases?

> `optional` **forbiddenPhrases?**: `string`[]

Defined in: [types/ioProcessor.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L64)

Phrases that must NOT appear in the response (case-insensitive)

---

### jsonSchema?

> `optional` **jsonSchema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/ioProcessor.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L66)

JSON Schema to validate the response against (response must be valid JSON)

---

### customValidator?

> `optional` **customValidator?**: (`text`) => [`ValidationIssue`](ValidationIssue.md) \| `null`

Defined in: [types/ioProcessor.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L68)

Custom validation function; return a ValidationIssue to signal failure, null to pass

#### Parameters

##### text

`string`

#### Returns

[`ValidationIssue`](ValidationIssue.md) \| `null`

---

### truncationAction?

> `optional` **truncationAction?**: `"abort"` \| `"retry"` \| `"truncate"` \| `"warn"`

Defined in: [types/ioProcessor.ts:76](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L76)

Action to take when maxLength is exceeded:

- "truncate" — slice text to maxLength + suffix (default)
- "abort" — return action:"abort"
- "retry" — return action:"retry" with feedback
- "warn" — log a warning but return the unmodified text

---

### truncationSuffix?

> `optional` **truncationSuffix?**: `string`

Defined in: [types/ioProcessor.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L78)

Suffix appended when truncating (default: "..."). Never causes the final string to exceed maxLength.

---

### retryOnFailure?

> `optional` **retryOnFailure?**: `boolean`

Defined in: [types/ioProcessor.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L80)

Return action:"retry" when any error-severity issue is found

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/ioProcessor.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L82)

Maximum allowed retry count (informational — caller enforces the loop)
