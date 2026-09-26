[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeTokenValidationResult

# Type Alias: ClaudeTokenValidationResult

> **ClaudeTokenValidationResult** = `object`

Token validation result

## Properties

### isValid

> **isValid**: `boolean`

Whether the token is valid

---

### expiresIn?

> `optional` **expiresIn?**: `number`

Remaining time in seconds until expiration

---

### scopes?

> `optional` **scopes?**: `string`[]

Scopes associated with the token

---

### user?

> `optional` **user?**: `object`

User information if available

#### id

> **id**: `string`

#### email?

> `optional` **email?**: `string`

#### subscription?

> `optional` **subscription?**: `string`

---

### error?

> `optional` **error?**: `string`

Error message if validation failed
