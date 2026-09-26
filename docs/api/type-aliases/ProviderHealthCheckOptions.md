[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderHealthCheckOptions

# Type Alias: ProviderHealthCheckOptions

> **ProviderHealthCheckOptions** = `object`

## Properties

### timeout?

> `optional` **timeout?**: `number`

---

### includeConnectivityTest?

> `optional` **includeConnectivityTest?**: `boolean`

---

### includeModelValidation?

> `optional` **includeModelValidation?**: `boolean`

---

### cacheResults?

> `optional` **cacheResults?**: `boolean`

---

### maxCacheAge?

> `optional` **maxCacheAge?**: `number`

Max age (ms) of a cached health-check result before it is treated as
stale. Only consulted when `cacheResults` is true — with
`cacheResults: false` this option has no effect. It does not affect the
circuit breaker's blacklist expiry, which uses its own fixed window
independent of any caller's `maxCacheAge`.
