[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatus

# Type Alias: AuthStatus

> **AuthStatus** = `object`

Authentication status result

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Whether the user is authenticated

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Authentication method in use

---

### expiresAt?

> `optional` **expiresAt?**: `Date`

Token expiration time (for OAuth)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Whether token refresh is needed (for OAuth)

---

### user?

> `optional` **user?**: `object`

User information (for OAuth)

#### id?

> `optional` **id?**: `string`

#### email?

> `optional` **email?**: `string`

#### subscription?

> `optional` **subscription?**: `string`
