[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatusResult

# Type Alias: AuthStatusResult

> **AuthStatusResult** = `object`

Defined in: [types/cli.ts:1094](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1094)

Result of checking authentication status for a provider.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1095)

---

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/cli.ts:1096](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1096)

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/cli.ts:1097](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1097)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: `string`

Defined in: [types/cli.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1098)

---

### tokenExpiry?

> `optional` **tokenExpiry?**: `string`

Defined in: [types/cli.ts:1099](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1099)

---

### hasRefreshToken?

> `optional` **hasRefreshToken?**: `boolean`

Defined in: [types/cli.ts:1100](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1100)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/cli.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1101)
