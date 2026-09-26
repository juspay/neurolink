[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionValidationResult

# Type Alias: SessionValidationResult

> **SessionValidationResult** = `object`

Session validation result

## Properties

### valid

> **valid**: `boolean`

Whether the session is valid

---

### session?

> `optional` **session?**: [`AuthSession`](AuthSession.md)

Validated session if valid

---

### error?

> `optional` **error?**: `string`

Error message if validation failed

---

### errorCode?

> `optional` **errorCode?**: [`AuthErrorCode`](AuthErrorCode.md)

Error code for programmatic handling

---

### refreshed?

> `optional` **refreshed?**: `boolean`

Whether session was refreshed
