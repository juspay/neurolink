[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatusResult

# Type Alias: AuthStatusResult

> **AuthStatusResult** = `object`

Defined in: [types/cli.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1102)

Result of checking authentication status for a provider.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1103)

---

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/cli.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1104)

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/cli.ts:1105](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1105)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: `string`

Defined in: [types/cli.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1106)

---

### tokenExpiry?

> `optional` **tokenExpiry?**: `string`

Defined in: [types/cli.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1107)

---

### hasRefreshToken?

> `optional` **hasRefreshToken?**: `boolean`

Defined in: [types/cli.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1108)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/cli.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1109)
