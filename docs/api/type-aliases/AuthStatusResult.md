[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatusResult

# Type Alias: AuthStatusResult

> **AuthStatusResult** = `object`

Defined in: [types/cli.ts:970](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L970)

Result of checking authentication status for a provider.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:971](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L971)

---

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/cli.ts:972](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L972)

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/cli.ts:973](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L973)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: `string`

Defined in: [types/cli.ts:974](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L974)

---

### tokenExpiry?

> `optional` **tokenExpiry?**: `string`

Defined in: [types/cli.ts:975](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L975)

---

### hasRefreshToken?

> `optional` **hasRefreshToken?**: `boolean`

Defined in: [types/cli.ts:976](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L976)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/cli.ts:977](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L977)
