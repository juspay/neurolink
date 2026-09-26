[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatusResult

# Type Alias: AuthStatusResult

> **AuthStatusResult** = `object`

Result of checking authentication status for a provider.

## Properties

### provider

> **provider**: `string`

---

### isAuthenticated

> **isAuthenticated**: `boolean`

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

---

### subscriptionTier?

> `optional` **subscriptionTier?**: `string`

---

### tokenExpiry?

> `optional` **tokenExpiry?**: `string`

---

### hasRefreshToken?

> `optional` **hasRefreshToken?**: `boolean`

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`
