[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeError

# Class: RealtimeError

Realtime Voice Error class for realtime-specific errors

## Extends

- [`VoiceError`](VoiceError.md)

## Constructors

### Constructor

> **new RealtimeError**(`options`): `RealtimeError`

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

#### Inherited from

[`VoiceError`](VoiceError.md).[`code`](VoiceError.md#code)

---

### category

> `readonly` **category**: `ErrorCategory`

#### Inherited from

[`VoiceError`](VoiceError.md).[`category`](VoiceError.md#category)

---

### severity

> `readonly` **severity**: `ErrorSeverity`

#### Inherited from

[`VoiceError`](VoiceError.md).[`severity`](VoiceError.md#severity)

---

### retriable

> `readonly` **retriable**: `boolean`

#### Inherited from

[`VoiceError`](VoiceError.md).[`retriable`](VoiceError.md#retriable)

---

### retryAfterMs?

> `readonly` `optional` **retryAfterMs?**: `number`

#### Inherited from

[`VoiceError`](VoiceError.md).[`retryAfterMs`](VoiceError.md#retryafterms)

---

### context

> `readonly` **context**: `Record`\<`string`, `unknown`\>

#### Inherited from

[`VoiceError`](VoiceError.md).[`context`](VoiceError.md#context)

---

### timestamp

> `readonly` **timestamp**: `Date`

#### Inherited from

[`VoiceError`](VoiceError.md).[`timestamp`](VoiceError.md#timestamp)

---

### toolName?

> `readonly` `optional` **toolName?**: `string`

#### Inherited from

[`VoiceError`](VoiceError.md).[`toolName`](VoiceError.md#toolname)

---

### serverId?

> `readonly` `optional` **serverId?**: `string`

#### Inherited from

[`VoiceError`](VoiceError.md).[`serverId`](VoiceError.md#serverid)

## Methods

### toJSON()

> **toJSON**(): [`StructuredError`](../type-aliases/StructuredError.md)

Convert to JSON for logging and serialization

#### Returns

[`StructuredError`](../type-aliases/StructuredError.md)

#### Inherited from

[`VoiceError`](VoiceError.md).[`toJSON`](VoiceError.md#tojson)

---

### connectionFailed()

> `static` **connectionFailed**(`reason`, `providerOrError?`, `originalErrorOrProvider?`): `RealtimeError`

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

Create an error for unconfigured provider

#### Parameters

##### provider

`string`

#### Returns

`RealtimeError`

---

### providerNotSupported()

> `static` **providerNotSupported**(`provider`, `availableProviders?`): `RealtimeError`

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

Create an error for duplicate session

#### Parameters

##### provider?

`string`

#### Returns

`RealtimeError`

---

### sessionNotActive()

> `static` **sessionNotActive**(`provider?`): `RealtimeError`

Create an error for no active session

#### Parameters

##### provider?

`string`

#### Returns

`RealtimeError`

---

### invalidMessage()

> `static` **invalidMessage**(`reason`, `provider?`): `RealtimeError`

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

Create an error for unconfigured provider (alias)

#### Parameters

##### provider

`string`

#### Returns

`RealtimeError`

---

### timeout()

> `static` **timeout**(`operation`, `timeoutMs`, `provider?`): `RealtimeError`

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
