[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceError

# Class: VoiceError

Base Voice Error class for all voice-related errors

## Extends

- `NeuroLinkError`

## Extended by

- [`RealtimeError`](RealtimeError.md)
- [`STTError`](STTError.md)

## Constructors

### Constructor

> **new VoiceError**(`options`): `VoiceError`

#### Parameters

##### options

[`VoiceErrorOptions`](../type-aliases/VoiceErrorOptions.md)

#### Returns

`VoiceError`

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
