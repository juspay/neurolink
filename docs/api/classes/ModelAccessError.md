[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAccessError

# Class: ModelAccessError

Defined in: [types/errors.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L184)

Error thrown when model access is denied based on subscription tier

## Extends

- [`BaseError`](BaseError.md)

## Constructors

### Constructor

> **new ModelAccessError**(`model`, `tier`, `requiredTier`): `ModelAccessError`

Defined in: [types/errors.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L189)

#### Parameters

##### model

`string`

##### tier

`string`

##### requiredTier

`string`

#### Returns

`ModelAccessError`

#### Overrides

[`BaseError`](BaseError.md).[`constructor`](BaseError.md#constructor)

## Properties

### model

> `readonly` **model**: `string`

Defined in: [types/errors.ts:185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L185)

---

### tier

> `readonly` **tier**: `string`

Defined in: [types/errors.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L186)

---

### requiredTier

> `readonly` **requiredTier**: `string`

Defined in: [types/errors.ts:187](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L187)
