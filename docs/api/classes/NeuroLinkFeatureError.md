[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkFeatureError

# Class: NeuroLinkFeatureError

Defined in: [core/infrastructure/baseError.ts:3](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseError.ts#L3)

## Extends

- `Error`

## Constructors

### Constructor

> **new NeuroLinkFeatureError**(`message`, `code`, `feature`, `options?`): `NeuroLinkFeatureError`

Defined in: [core/infrastructure/baseError.ts:10](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseError.ts#L10)

#### Parameters

##### message

`string`

##### code

`string`

##### feature

`string`

##### options?

###### retryable?

`boolean`

###### details?

`Record`\<`string`, `unknown`\>

###### cause?

`Error`

#### Returns

`NeuroLinkFeatureError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `string`

Defined in: [core/infrastructure/baseError.ts:4](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseError.ts#L4)

---

### feature

> `readonly` **feature**: `string`

Defined in: [core/infrastructure/baseError.ts:5](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseError.ts#L5)

---

### retryable

> `readonly` **retryable**: `boolean`

Defined in: [core/infrastructure/baseError.ts:6](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseError.ts#L6)

---

### details?

> `readonly` `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [core/infrastructure/baseError.ts:7](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseError.ts#L7)

---

### cause?

> `readonly` `optional` **cause?**: `Error`

Defined in: [core/infrastructure/baseError.ts:8](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseError.ts#L8)

#### Overrides

`Error.cause`
