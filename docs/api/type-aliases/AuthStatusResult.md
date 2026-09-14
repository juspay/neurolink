[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatusResult

# Type Alias: AuthStatusResult

> **AuthStatusResult** = `object`

Defined in: [types/cli.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1091)

Result of checking authentication status for a provider.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1092](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1092)

---

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/cli.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1093)

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/cli.ts:1094](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1094)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: `string`

Defined in: [types/cli.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1095)

---

### tokenExpiry?

> `optional` **tokenExpiry?**: `string`

Defined in: [types/cli.ts:1096](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1096)

---

### hasRefreshToken?

> `optional` **hasRefreshToken?**: `boolean`

Defined in: [types/cli.ts:1097](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1097)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/cli.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1098)
