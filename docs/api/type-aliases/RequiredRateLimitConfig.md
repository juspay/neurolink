[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequiredRateLimitConfig

# Type Alias: RequiredRateLimitConfig

> **RequiredRateLimitConfig** = `object`

Required rate limit configuration

## Properties

### enabled

> **enabled**: `boolean`

---

### windowMs

> **windowMs**: `number`

---

### maxRequests

> **maxRequests**: `number`

---

### message

> **message**: `string`

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`
