[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatus

# Type Alias: AuthStatus

> **AuthStatus** = `object`

Defined in: [types/subscription.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1111)

Authentication status result

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/subscription.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1113)

Whether the user is authenticated

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/subscription.ts:1115](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1115)

Authentication method in use

---

### expiresAt?

> `optional` **expiresAt?**: `Date`

Defined in: [types/subscription.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1117)

Token expiration time (for OAuth)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/subscription.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1119)

Whether token refresh is needed (for OAuth)

---

### user?

> `optional` **user?**: `object`

Defined in: [types/subscription.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1121)

User information (for OAuth)

#### id?

> `optional` **id?**: `string`

#### email?

> `optional` **email?**: `string`

#### subscription?

> `optional` **subscription?**: `string`
