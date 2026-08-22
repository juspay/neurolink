[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceError

# Class: VoiceError

Defined in: [voice/errors.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/voice/errors.ts#L24)

Base Voice Error class for all voice-related errors

## Extends

- `NeuroLinkError`

## Extended by

- [`RealtimeError`](RealtimeError.md)
- [`STTError`](STTError.md)

## Constructors

### Constructor

> **new VoiceError**(`options`): `VoiceError`

Defined in: [voice/errors.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/voice/errors.ts#L25)

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

Defined in: [utils/errorHandling.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L105)

#### Inherited from

`NeuroLinkError.code`

---

### category

> `readonly` **category**: `ErrorCategory`

Defined in: [utils/errorHandling.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L106)

#### Inherited from

`NeuroLinkError.category`

---

### severity

> `readonly` **severity**: `ErrorSeverity`

Defined in: [utils/errorHandling.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L107)

#### Inherited from

`NeuroLinkError.severity`

---

### retriable

> `readonly` **retriable**: `boolean`

Defined in: [utils/errorHandling.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L108)

#### Inherited from

`NeuroLinkError.retriable`

---

### retryAfterMs?

> `readonly` `optional` **retryAfterMs?**: `number`

Defined in: [utils/errorHandling.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L109)

#### Inherited from

`NeuroLinkError.retryAfterMs`

---

### context

> `readonly` **context**: `Record`\<`string`, `unknown`\>

Defined in: [utils/errorHandling.ts:110](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L110)

#### Inherited from

`NeuroLinkError.context`

---

### timestamp

> `readonly` **timestamp**: `Date`

Defined in: [utils/errorHandling.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L111)

#### Inherited from

`NeuroLinkError.timestamp`

---

### toolName?

> `readonly` `optional` **toolName?**: `string`

Defined in: [utils/errorHandling.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L112)

#### Inherited from

`NeuroLinkError.toolName`

---

### serverId?

> `readonly` `optional` **serverId?**: `string`

Defined in: [utils/errorHandling.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L113)

#### Inherited from

`NeuroLinkError.serverId`

## Methods

### toJSON()

> **toJSON**(): [`StructuredError`](../type-aliases/StructuredError.md)

Defined in: [utils/errorHandling.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/utils/errorHandling.ts#L149)

Convert to JSON for logging and serialization

#### Returns

[`StructuredError`](../type-aliases/StructuredError.md)

#### Inherited from

`NeuroLinkError.toJSON`
