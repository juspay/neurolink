[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicError

# Class: MusicError

Typed error class for music-generation failures.

## Extends

- `NeuroLinkError`

## Constructors

### Constructor

> **new MusicError**(`options`): `MusicError`

#### Parameters

##### options

###### code

`string`

###### message

`string`

###### category?

`ErrorCategory`

###### severity?

`ErrorSeverity`

###### retriable?

`boolean`

###### context?

`Record`\<`string`, `unknown`\>

###### originalError?

`Error`

#### Returns

`MusicError`

#### Overrides

`NeuroLinkError.constructor`

## Properties

### code

> `readonly` **code**: `string`

#### Inherited from

`NeuroLinkError.code`

---

### category

> `readonly` **category**: `ErrorCategory`

#### Inherited from

`NeuroLinkError.category`

---

### severity

> `readonly` **severity**: `ErrorSeverity`

#### Inherited from

`NeuroLinkError.severity`

---

### retriable

> `readonly` **retriable**: `boolean`

#### Inherited from

`NeuroLinkError.retriable`

---

### retryAfterMs?

> `readonly` `optional` **retryAfterMs?**: `number`

#### Inherited from

`NeuroLinkError.retryAfterMs`

---

### context

> `readonly` **context**: `Record`\<`string`, `unknown`\>

#### Inherited from

`NeuroLinkError.context`

---

### timestamp

> `readonly` **timestamp**: `Date`

#### Inherited from

`NeuroLinkError.timestamp`

---

### toolName?

> `readonly` `optional` **toolName?**: `string`

#### Inherited from

`NeuroLinkError.toolName`

---

### serverId?

> `readonly` `optional` **serverId?**: `string`

#### Inherited from

`NeuroLinkError.serverId`

## Methods

### toJSON()

> **toJSON**(): [`StructuredError`](../type-aliases/StructuredError.md)

Convert to JSON for logging and serialization

#### Returns

[`StructuredError`](../type-aliases/StructuredError.md)

#### Inherited from

`NeuroLinkError.toJSON`
