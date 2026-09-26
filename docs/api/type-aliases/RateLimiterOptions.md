[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterOptions

# Type Alias: RateLimiterOptions

> **RateLimiterOptions** = `object`

Rate limiter options

## Properties

### maxRequests

> **maxRequests**: `number`

Maximum requests per window

---

### windowMs

> **windowMs**: `number`

Window size in milliseconds

---

### strategy?

> `optional` **strategy?**: `"queue"` \| `"throw"`

Strategy when limit is reached: 'queue' or 'throw'

---

### onRateLimited?

> `optional` **onRateLimited?**: (`waitTime`) => `void`

Callback when rate limited

#### Parameters

##### waitTime

`number`

#### Returns

`void`
