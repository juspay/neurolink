[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeTokenValidationResult

# Type Alias: ClaudeTokenValidationResult

> **ClaudeTokenValidationResult** = `object`

Defined in: [types/subscription.ts:904](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L904)

Token validation result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/subscription.ts:906](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L906)

Whether the token is valid

---

### expiresIn?

> `optional` **expiresIn?**: `number`

Defined in: [types/subscription.ts:908](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L908)

Remaining time in seconds until expiration

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:910](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L910)

Scopes associated with the token

---

### user?

> `optional` **user?**: `object`

Defined in: [types/subscription.ts:912](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L912)

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

Defined in: [types/subscription.ts:918](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L918)

Error message if validation failed
