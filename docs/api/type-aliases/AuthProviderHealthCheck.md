[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderHealthCheck

# Type Alias: AuthProviderHealthCheck

> **AuthProviderHealthCheck** = `object`

Defined in: [types/auth.ts:1004](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1004)

Health check result for auth providers (detailed)

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/auth.ts:1006](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1006)

Provider is healthy

---

### provider

> **provider**: [`AuthProviderType`](AuthProviderType.md)

Defined in: [types/auth.ts:1008](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1008)

Provider type

---

### latency?

> `optional` **latency?**: `number`

Defined in: [types/auth.ts:1010](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1010)

Response time in ms

---

### lastCheck?

> `optional` **lastCheck?**: `Date`

Defined in: [types/auth.ts:1012](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1012)

Last successful check

---

### error?

> `optional` **error?**: `string`

Defined in: [types/auth.ts:1014](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1014)

Error message if unhealthy

---

### details?

> `optional` **details?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/auth.ts:1016](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1016)

Additional details
