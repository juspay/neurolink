[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthHealthCheck

# Type Alias: AuthHealthCheck

> **AuthHealthCheck** = `object`

Auth health check result

## Properties

### healthy

> **healthy**: `boolean`

Overall health status

---

### providerConnected

> **providerConnected**: `boolean`

Provider connection status

---

### sessionStorageHealthy

> **sessionStorageHealthy**: `boolean`

Session storage status

---

### lastSuccessfulAuth?

> `optional` **lastSuccessfulAuth?**: `Date`

Last successful authentication

---

### error?

> `optional` **error?**: `string`

Error details if unhealthy
