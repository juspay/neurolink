[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryContext

# Type Alias: RetryContext

> **RetryContext** = `object`

Context for retry decision making

## Properties

### attempt

> **attempt**: `number`

Current attempt number (0-indexed)

---

### error

> **error**: `Error`

The error that triggered the retry

---

### elapsedMs

> **elapsedMs**: `number`

Total elapsed time since first attempt

---

### operationName

> **operationName**: `string`

Operation name for logging

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Additional metadata
