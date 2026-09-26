[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderHealthCheckOptions

# Type Alias: ProviderHealthCheckOptions

> **ProviderHealthCheckOptions** = `object`

Defined in: [types/providers.ts:1989](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1989)

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1990](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1990)

---

### includeConnectivityTest?

> `optional` **includeConnectivityTest?**: `boolean`

Defined in: [types/providers.ts:1991](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1991)

---

### includeModelValidation?

> `optional` **includeModelValidation?**: `boolean`

Defined in: [types/providers.ts:1992](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1992)

---

### cacheResults?

> `optional` **cacheResults?**: `boolean`

Defined in: [types/providers.ts:1993](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1993)

---

### maxCacheAge?

> `optional` **maxCacheAge?**: `number`

Defined in: [types/providers.ts:2001](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2001)

Max age (ms) of a cached health-check result before it is treated as
stale. Only consulted when `cacheResults` is true — with
`cacheResults: false` this option has no effect. It does not affect the
circuit breaker's blacklist expiry, which uses its own fixed window
independent of any caller's `maxCacheAge`.
