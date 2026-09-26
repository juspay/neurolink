[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitMiddlewareConfig

# Type Alias: RateLimitMiddlewareConfig

> **RateLimitMiddlewareConfig** = `object`

Rate-limit middleware configuration.

## Properties

### maxRequests

> **maxRequests**: `number`

---

### windowMs

> **windowMs**: `number`

---

### message?

> `optional` **message?**: `string`

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

---

### onRateLimitExceeded?

> `optional` **onRateLimitExceeded?**: (`ctx`, `retryAfter`) => `unknown`

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

##### retryAfter

`number`

#### Returns

`unknown`

---

### store?

> `optional` **store?**: [`RateLimitStore`](RateLimitStore.md)
