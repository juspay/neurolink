[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeError

# Class: RealtimeError

Defined in: [voice/errors.ts:244](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L244)

Realtime Voice Error class for realtime-specific errors

## Extends

- [`VoiceError`](VoiceError.md)

## Constructors

### Constructor

> **new RealtimeError**(`options`): `RealtimeError`

Defined in: [voice/errors.ts:245](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L245)

#### Parameters

##### options

[`VoiceErrorOptions`](../type-aliases/VoiceErrorOptions.md)

#### Returns

`RealtimeError`

#### Overrides

[`VoiceError`](VoiceError.md).[`constructor`](VoiceError.md#constructor)

## Properties

### code

> `readonly` **code**: `string`

Defined in: [utils/errorHandling.ts:105](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L105)

#### Inherited from

[`VoiceError`](VoiceError.md).[`code`](VoiceError.md#code)

---

### category

> `readonly` **category**: `ErrorCategory`

Defined in: [utils/errorHandling.ts:106](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L106)

#### Inherited from

[`VoiceError`](VoiceError.md).[`category`](VoiceError.md#category)

---

### severity

> `readonly` **severity**: `ErrorSeverity`

Defined in: [utils/errorHandling.ts:107](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L107)

#### Inherited from

[`VoiceError`](VoiceError.md).[`severity`](VoiceError.md#severity)

---

### retriable

> `readonly` **retriable**: `boolean`

Defined in: [utils/errorHandling.ts:108](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L108)

#### Inherited from

[`VoiceError`](VoiceError.md).[`retriable`](VoiceError.md#retriable)

---

### retryAfterMs?

> `readonly` `optional` **retryAfterMs?**: `number`

Defined in: [utils/errorHandling.ts:109](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L109)

#### Inherited from

[`VoiceError`](VoiceError.md).[`retryAfterMs`](VoiceError.md#retryafterms)

---

### context

> `readonly` **context**: `Record`\<`string`, `unknown`\>

Defined in: [utils/errorHandling.ts:110](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L110)

#### Inherited from

[`VoiceError`](VoiceError.md).[`context`](VoiceError.md#context)

---

### timestamp

> `readonly` **timestamp**: `Date`

Defined in: [utils/errorHandling.ts:111](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L111)

#### Inherited from

[`VoiceError`](VoiceError.md).[`timestamp`](VoiceError.md#timestamp)

---

### toolName?

> `readonly` `optional` **toolName?**: `string`

Defined in: [utils/errorHandling.ts:112](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L112)

#### Inherited from

[`VoiceError`](VoiceError.md).[`toolName`](VoiceError.md#toolname)

---

### serverId?

> `readonly` `optional` **serverId?**: `string`

Defined in: [utils/errorHandling.ts:113](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L113)

#### Inherited from

[`VoiceError`](VoiceError.md).[`serverId`](VoiceError.md#serverid)

## Methods

### toJSON()

> **toJSON**(): [`StructuredError`](../type-aliases/StructuredError.md)

Defined in: [utils/errorHandling.ts:149](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L149)

Convert to JSON for logging and serialization

#### Returns

[`StructuredError`](../type-aliases/StructuredError.md)

#### Inherited from

[`VoiceError`](VoiceError.md).[`toJSON`](VoiceError.md#tojson)

---

### connectionFailed()

> `static` **connectionFailed**(`reason`, `providerOrError?`, `originalErrorOrProvider?`): `RealtimeError`

Defined in: [voice/errors.ts:261](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L261)

Create an error for connection failure
Supports two signatures:

- connectionFailed(reason, provider?, originalError?)
- connectionFailed(reason, originalError?, provider?)

#### Parameters

##### reason

`string`

##### providerOrError?

`string` \| `Error`

##### originalErrorOrProvider?

`string` \| `Error`

#### Returns

`RealtimeError`

---

### sessionTimeout()

> `static` **sessionTimeout**(`timeoutMs`, `provider?`): `RealtimeError`

Defined in: [voice/errors.ts:299](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L299)

Create an error for session timeout

#### Parameters

##### timeoutMs

`number`

##### provider?

`string`

#### Returns

`RealtimeError`

---

### protocolError()

> `static` **protocolError**(`reason`, `provider?`, `originalError?`): `RealtimeError`

Defined in: [voice/errors.ts:313](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L313)

Create an error for protocol errors

#### Parameters

##### reason

`string`

##### provider?

`string`

##### originalError?

`Error`

#### Returns

`RealtimeError`

---

### audioStreamError()

> `static` **audioStreamError**(`reason`, `provider?`): `RealtimeError`

Defined in: [voice/errors.ts:332](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L332)

Create an error for audio stream failures

#### Parameters

##### reason

`string`

##### provider?

`string`

#### Returns

`RealtimeError`

---

### providerNotConfigured()

> `static` **providerNotConfigured**(`provider`): `RealtimeError`

Defined in: [voice/errors.ts:346](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L346)

Create an error for unconfigured provider

#### Parameters

##### provider

`string`

#### Returns

`RealtimeError`

---

### providerNotSupported()

> `static` **providerNotSupported**(`provider`, `availableProviders?`): `RealtimeError`

Defined in: [voice/errors.ts:360](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L360)

Create an error for unsupported provider

#### Parameters

##### provider

`string`

##### availableProviders?

`string`[]

#### Returns

`RealtimeError`

---

### sessionAlreadyActive()

> `static` **sessionAlreadyActive**(`provider?`): `RealtimeError`

Defined in: [voice/errors.ts:377](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L377)

Create an error for duplicate session

#### Parameters

##### provider?

`string`

#### Returns

`RealtimeError`

---

### sessionNotActive()

> `static` **sessionNotActive**(`provider?`): `RealtimeError`

Defined in: [voice/errors.ts:391](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L391)

Create an error for no active session

#### Parameters

##### provider?

`string`

#### Returns

`RealtimeError`

---

### invalidMessage()

> `static` **invalidMessage**(`reason`, `provider?`): `RealtimeError`

Defined in: [voice/errors.ts:405](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L405)

Create an error for invalid messages

#### Parameters

##### reason

`string`

##### provider?

`string`

#### Returns

`RealtimeError`

---

### connectionClosed()

> `static` **connectionClosed**(`reason`, `sessionId?`, `provider?`): `RealtimeError`

Defined in: [voice/errors.ts:419](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L419)

Create an error for connection closed unexpectedly

#### Parameters

##### reason

`string`

##### sessionId?

`string`

##### provider?

`string`

#### Returns

`RealtimeError`

---

### notConfigured()

> `static` **notConfigured**(`provider`): `RealtimeError`

Defined in: [voice/errors.ts:437](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L437)

Create an error for unconfigured provider (alias)

#### Parameters

##### provider

`string`

#### Returns

`RealtimeError`

---

### timeout()

> `static` **timeout**(`operation`, `timeoutMs`, `provider?`): `RealtimeError`

Defined in: [voice/errors.ts:444](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L444)

Create an error for operation timeout

#### Parameters

##### operation

`string`

##### timeoutMs

`number`

##### provider?

`string`

#### Returns

`RealtimeError`
