[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatus

# Type Alias: AuthStatus

> **AuthStatus** = `object`

Defined in: [types/subscription.ts:1027](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1027)

Authentication status result

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/subscription.ts:1029](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1029)

Whether the user is authenticated

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/subscription.ts:1031](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1031)

Authentication method in use

---

### expiresAt?

> `optional` **expiresAt?**: `Date`

Defined in: [types/subscription.ts:1033](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1033)

Token expiration time (for OAuth)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/subscription.ts:1035](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1035)

Whether token refresh is needed (for OAuth)

---

### user?

> `optional` **user?**: `object`

Defined in: [types/subscription.ts:1037](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1037)

User information (for OAuth)

#### id?

> `optional` **id?**: `string`

#### email?

> `optional` **email?**: `string`

#### subscription?

> `optional` **subscription?**: `string`
