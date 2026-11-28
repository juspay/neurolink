[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderUsageRebase

# Type Alias: ProviderUsageRebase

> **ProviderUsageRebase** = `object`

The input count is cache-inclusive (and must be rebased) when any
`whenAnyPresent` path is set and no `unlessAnyPresent` path is.

## Properties

### whenAnyPresent

> **whenAnyPresent**: `string`[]

---

### unlessAnyPresent

> **unlessAnyPresent**: `string`[]

---

### uncachedInput

> **uncachedInput**: `string`

Path of an explicit uncached input count, used when present.

---

### cacheWrite

> **cacheWrite**: `string`

Path of the cache-write count subtracted otherwise.
