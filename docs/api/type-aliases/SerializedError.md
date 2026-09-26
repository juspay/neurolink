[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SerializedError

# Type Alias: SerializedError

> **SerializedError** = `object`

Serialized error representation with full context.

## Properties

### errorId

> **errorId**: `string`

---

### errorFingerprint

> **errorFingerprint**: `string`

---

### errorType

> **errorType**: `string`

---

### message

> **message**: `string`

---

### stack?

> `optional` **stack?**: `string`

---

### stackFrames?

> `optional` **stackFrames?**: `string`[]

---

### statusCode?

> `optional` **statusCode?**: `number`

---

### isOperational?

> `optional` **isOperational?**: `boolean`

---

### isRetryable?

> `optional` **isRetryable?**: `boolean`

---

### code?

> `optional` **code?**: `string`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

---

### cause?

> `optional` **cause?**: `SerializedError`

---

### timestamp

> **timestamp**: `string`
