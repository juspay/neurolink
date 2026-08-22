[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatusResult

# Type Alias: AuthStatusResult

> **AuthStatusResult** = `object`

Defined in: [types/cli.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1068)

Result of checking authentication status for a provider.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1069)

---

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/cli.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1070)

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/cli.ts:1071](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1071)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: `string`

Defined in: [types/cli.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1072)

---

### tokenExpiry?

> `optional` **tokenExpiry?**: `string`

Defined in: [types/cli.ts:1073](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1073)

---

### hasRefreshToken?

> `optional` **hasRefreshToken?**: `boolean`

Defined in: [types/cli.ts:1074](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1074)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/cli.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1075)
