[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryOptions

# Type Alias: RetryOptions

> **RetryOptions** = `object`

Defined in: [types/utilities.ts:203](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L203)

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/utilities.ts:204](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L204)

---

### initialDelay?

> `optional` **initialDelay?**: `number`

Defined in: [types/utilities.ts:205](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L205)

---

### maxDelay?

> `optional` **maxDelay?**: `number`

Defined in: [types/utilities.ts:206](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L206)

---

### backoffMultiplier?

> `optional` **backoffMultiplier?**: `number`

Defined in: [types/utilities.ts:207](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L207)

---

### retryCondition?

> `optional` **retryCondition?**: (`error`) => `boolean`

Defined in: [types/utilities.ts:208](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L208)

#### Parameters

##### error

`unknown`

#### Returns

`boolean`

---

### onRetry?

> `optional` **onRetry?**: (`attempt`, `error`) => `void`

Defined in: [types/utilities.ts:209](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L209)

#### Parameters

##### attempt

`number`

##### error

`unknown`

#### Returns

`void`
