[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeTokenValidationResult

# Type Alias: ClaudeTokenValidationResult

> **ClaudeTokenValidationResult** = `object`

Defined in: [types/subscription.ts:986](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L986)

Token validation result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/subscription.ts:988](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L988)

Whether the token is valid

---

### expiresIn?

> `optional` **expiresIn?**: `number`

Defined in: [types/subscription.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L990)

Remaining time in seconds until expiration

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L992)

Scopes associated with the token

---

### user?

> `optional` **user?**: `object`

Defined in: [types/subscription.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L994)

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

Defined in: [types/subscription.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1000)

Error message if validation failed
