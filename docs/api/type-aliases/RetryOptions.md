[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryOptions

# Type Alias: RetryOptions

> **RetryOptions** = `object`

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

---

### initialDelay?

> `optional` **initialDelay?**: `number`

---

### maxDelay?

> `optional` **maxDelay?**: `number`

---

### backoffMultiplier?

> `optional` **backoffMultiplier?**: `number`

---

### retryCondition?

> `optional` **retryCondition?**: (`error`) => `boolean`

#### Parameters

##### error

`unknown`

#### Returns

`boolean`

---

### onRetry?

> `optional` **onRetry?**: (`attempt`, `error`) => `void`

#### Parameters

##### attempt

`number`

##### error

`unknown`

#### Returns

`void`
