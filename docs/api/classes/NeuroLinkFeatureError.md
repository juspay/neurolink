[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkFeatureError

# Class: NeuroLinkFeatureError

## Extends

- `Error`

## Constructors

### Constructor

> **new NeuroLinkFeatureError**(`message`, `code`, `feature`, `options?`): `NeuroLinkFeatureError`

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

---

### feature

> `readonly` **feature**: `string`

---

### retryable

> `readonly` **retryable**: `boolean`

---

### details?

> `readonly` `optional` **details?**: `Record`\<`string`, `unknown`\>

---

### cause?

> `readonly` `optional` **cause?**: `Error`

#### Overrides

`Error.cause`
