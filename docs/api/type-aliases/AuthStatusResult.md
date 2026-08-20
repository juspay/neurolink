[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatusResult

# Type Alias: AuthStatusResult

> **AuthStatusResult** = `object`

Defined in: [types/cli.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1072)

Result of checking authentication status for a provider.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1073](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1073)

---

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/cli.ts:1074](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1074)

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/cli.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1075)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: `string`

Defined in: [types/cli.ts:1076](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1076)

---

### tokenExpiry?

> `optional` **tokenExpiry?**: `string`

Defined in: [types/cli.ts:1077](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1077)

---

### hasRefreshToken?

> `optional` **hasRefreshToken?**: `boolean`

Defined in: [types/cli.ts:1078](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1078)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/cli.ts:1079](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1079)
