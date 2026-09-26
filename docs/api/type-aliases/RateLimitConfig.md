[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitConfig

# Type Alias: RateLimitConfig

> **RateLimitConfig** = `object`

Rate limiting configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Enable rate limiting (default: true)

---

### windowMs?

> `optional` **windowMs?**: `number`

Time window in milliseconds (default: 15 minutes)

---

### maxRequests?

> `optional` **maxRequests?**: `number`

Maximum requests per window (default: 100)

---

### message?

> `optional` **message?**: `string`

Custom error message

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Skip rate limiting for certain paths

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Custom key generator function

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`
