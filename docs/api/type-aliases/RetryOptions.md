[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryOptions

# Type Alias: RetryOptions

> **RetryOptions** = `object`

Defined in: [types/utilities.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L217)

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/utilities.ts:218](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L218)

---

### initialDelay?

> `optional` **initialDelay?**: `number`

Defined in: [types/utilities.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L219)

---

### maxDelay?

> `optional` **maxDelay?**: `number`

Defined in: [types/utilities.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L220)

---

### backoffMultiplier?

> `optional` **backoffMultiplier?**: `number`

Defined in: [types/utilities.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L221)

---

### retryCondition?

> `optional` **retryCondition?**: (`error`) => `boolean`

Defined in: [types/utilities.ts:222](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L222)

#### Parameters

##### error

`unknown`

#### Returns

`boolean`

---

### onRetry?

> `optional` **onRetry?**: (`attempt`, `error`) => `void`

Defined in: [types/utilities.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L223)

#### Parameters

##### attempt

`number`

##### error

`unknown`

#### Returns

`void`
