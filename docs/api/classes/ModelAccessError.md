[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAccessError

# Class: ModelAccessError

Defined in: [types/errors.ts:227](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L227)

Error thrown when model access is denied based on subscription tier

## Extends

- [`BaseError`](BaseError.md)

## Constructors

### Constructor

> **new ModelAccessError**(`model`, `tier`, `requiredTier`): `ModelAccessError`

Defined in: [types/errors.ts:232](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L232)

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

Defined in: [types/errors.ts:228](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L228)

---

### tier

> `readonly` **tier**: `string`

Defined in: [types/errors.ts:229](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L229)

---

### requiredTier

> `readonly` **requiredTier**: `string`

Defined in: [types/errors.ts:230](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L230)
