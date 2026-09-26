[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderHealthCheck

# Type Alias: AuthProviderHealthCheck

> **AuthProviderHealthCheck** = `object`

Health check result for auth providers (detailed)

## Properties

### healthy

> **healthy**: `boolean`

Provider is healthy

---

### provider

> **provider**: [`AuthProviderType`](AuthProviderType.md)

Provider type

---

### latency?

> `optional` **latency?**: `number`

Response time in ms

---

### lastCheck?

> `optional` **lastCheck?**: `Date`

Last successful check

---

### error?

> `optional` **error?**: `string`

Error message if unhealthy

---

### details?

> `optional` **details?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Additional details
