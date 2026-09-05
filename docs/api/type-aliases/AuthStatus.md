[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatus

# Type Alias: AuthStatus

> **AuthStatus** = `object`

Defined in: [types/subscription.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1110)

Authentication status result

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/subscription.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1112)

Whether the user is authenticated

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/subscription.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1114)

Authentication method in use

---

### expiresAt?

> `optional` **expiresAt?**: `Date`

Defined in: [types/subscription.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1116)

Token expiration time (for OAuth)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/subscription.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1118)

Whether token refresh is needed (for OAuth)

---

### user?

> `optional` **user?**: `object`

Defined in: [types/subscription.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1120)

User information (for OAuth)

#### id?

> `optional` **id?**: `string`

#### email?

> `optional` **email?**: `string`

#### subscription?

> `optional` **subscription?**: `string`
