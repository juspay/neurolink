[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingAccount

# Type Alias: CloakingAccount

> **CloakingAccount** = `object`

Minimal account shape needed by the cloaking pipeline.

## Properties

### id

> **id**: `string`

---

### type

> **type**: `"api_key"` \| `"oauth"`

---

### status

> **status**: `"healthy"` \| `"quota_exceeded"` \| `"error"`

---

### consecutiveFailures

> **consecutiveFailures**: `number`

---

### requestCount

> **requestCount**: `number`

---

### lastUsed

> **lastUsed**: `number`

---

### apiKey?

> `optional` **apiKey?**: `string`
