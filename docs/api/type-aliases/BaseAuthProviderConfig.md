[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseAuthProviderConfig

# Type Alias: BaseAuthProviderConfig

> **BaseAuthProviderConfig** = `object`

Defined in: [types/auth.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L398)

Base authentication provider configuration.

Contains the common fields shared by every provider-specific config variant.
Provider-specific fields are added via intersection in [AuthProviderConfig](AuthProviderConfig.md).

## Properties

### type

> **type**: [`AuthProviderType`](AuthProviderType.md)

Defined in: [types/auth.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L400)

Provider type

---

### required?

> `optional` **required?**: `boolean`

Defined in: [types/auth.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L402)

Whether authentication is required

---

### debug?

> `optional` **debug?**: `boolean`

Defined in: [types/auth.ts:404](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L404)

Enable debug logging

---

### tokenValidation?

> `optional` **tokenValidation?**: [`TokenValidationConfig`](TokenValidationConfig.md)

Defined in: [types/auth.ts:406](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L406)

Custom token validation options

---

### tokenExtraction?

> `optional` **tokenExtraction?**: [`TokenExtractionStrategy`](TokenExtractionStrategy.md)

Defined in: [types/auth.ts:408](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L408)

Token extraction strategy

---

### session?

> `optional` **session?**: [`SessionConfig`](SessionConfig.md)

Defined in: [types/auth.ts:410](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L410)

Session configuration

---

### rbac?

> `optional` **rbac?**: [`RBACConfig`](RBACConfig.md)

Defined in: [types/auth.ts:412](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L412)

RBAC configuration

---

### cache?

> `optional` **cache?**: [`AuthCacheConfig`](AuthCacheConfig.md)

Defined in: [types/auth.ts:414](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L414)

Cache configuration

---

### options?

> `optional` **options?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/auth.ts:416](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L416)

Provider-specific options (generic extensibility point)
