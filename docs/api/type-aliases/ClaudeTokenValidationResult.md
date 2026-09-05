[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeTokenValidationResult

# Type Alias: ClaudeTokenValidationResult

> **ClaudeTokenValidationResult** = `object`

Defined in: [types/subscription.ts:987](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L987)

Token validation result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/subscription.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L989)

Whether the token is valid

---

### expiresIn?

> `optional` **expiresIn?**: `number`

Defined in: [types/subscription.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L991)

Remaining time in seconds until expiration

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L993)

Scopes associated with the token

---

### user?

> `optional` **user?**: `object`

Defined in: [types/subscription.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L995)

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

Defined in: [types/subscription.ts:1001](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1001)

Error message if validation failed
