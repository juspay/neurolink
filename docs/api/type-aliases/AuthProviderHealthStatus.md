[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderHealthStatus

# Type Alias: AuthProviderHealthStatus

> **AuthProviderHealthStatus** = `object`

Auth-domain provider health status returned by AuthProviderRegistry.

Not to be confused with the AI-provider `ProviderHealthStatus` union in
`providers.ts`; this type tracks auth-provider connectivity.

## Properties

### type

> **type**: [`AuthProviderType`](AuthProviderType.md)

---

### healthy

> **healthy**: `boolean`

---

### lastCheck

> **lastCheck**: `Date`

---

### latency?

> `optional` **latency?**: `number`

---

### error?

> `optional` **error?**: `string`
