[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseAuthProviderConfig

# Type Alias: BaseAuthProviderConfig

> **BaseAuthProviderConfig** = `object`

Base authentication provider configuration.

Contains the common fields shared by every provider-specific config variant.
Provider-specific fields are added via intersection in [AuthProviderConfig](AuthProviderConfig.md).

## Properties

### type

> **type**: [`AuthProviderType`](AuthProviderType.md)

Provider type

---

### required?

> `optional` **required?**: `boolean`

Whether authentication is required

---

### debug?

> `optional` **debug?**: `boolean`

Enable debug logging

---

### tokenValidation?

> `optional` **tokenValidation?**: [`TokenValidationConfig`](TokenValidationConfig.md)

Custom token validation options

---

### tokenExtraction?

> `optional` **tokenExtraction?**: [`TokenExtractionStrategy`](TokenExtractionStrategy.md)

Token extraction strategy

---

### session?

> `optional` **session?**: [`SessionConfig`](SessionConfig.md)

Session configuration

---

### rbac?

> `optional` **rbac?**: [`RBACConfig`](RBACConfig.md)

RBAC configuration

---

### cache?

> `optional` **cache?**: [`AuthCacheConfig`](AuthCacheConfig.md)

Cache configuration

---

### options?

> `optional` **options?**: [`UnknownRecord`](UnknownRecord.md)

Provider-specific options (generic extensibility point)
