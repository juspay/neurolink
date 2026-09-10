[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthStatusResult

# Type Alias: AuthStatusResult

> **AuthStatusResult** = `object`

Defined in: [types/cli.ts:1079](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1079)

Result of checking authentication status for a provider.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1080](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1080)

---

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/cli.ts:1081](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1081)

---

### method

> **method**: `"api-key"` \| `"oauth"` \| `"none"`

Defined in: [types/cli.ts:1082](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1082)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: `string`

Defined in: [types/cli.ts:1083](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1083)

---

### tokenExpiry?

> `optional` **tokenExpiry?**: `string`

Defined in: [types/cli.ts:1084](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1084)

---

### hasRefreshToken?

> `optional` **hasRefreshToken?**: `boolean`

Defined in: [types/cli.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1085)

---

### needsRefresh?

> `optional` **needsRefresh?**: `boolean`

Defined in: [types/cli.ts:1086](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1086)
