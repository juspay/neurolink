[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAccessError

# Class: ModelAccessError

Error thrown when model access is denied based on subscription tier

## Extends

- [`BaseError`](BaseError.md)

## Constructors

### Constructor

> **new ModelAccessError**(`model`, `tier`, `requiredTier`): `ModelAccessError`

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

---

### tier

> `readonly` **tier**: `string`

---

### requiredTier

> `readonly` **requiredTier**: `string`
