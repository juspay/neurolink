[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTError

# Class: STTError

STT Error class for speech-to-text specific errors

## Extends

- [`VoiceError`](VoiceError.md)

## Constructors

### Constructor

> **new STTError**(`options`): `STTError`

#### Parameters

##### options

[`VoiceErrorOptions`](../type-aliases/VoiceErrorOptions.md)

#### Returns

`STTError`

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

### audioEmpty()

> `static` **audioEmpty**(`provider?`): `STTError`

Create an error for empty audio input

#### Parameters

##### provider?

`string`

#### Returns

`STTError`

---

### audioTooLong()

> `static` **audioTooLong**(`durationSeconds`, `maxDurationSeconds`, `provider?`): `STTError`

Create an error for audio that exceeds maximum duration

#### Parameters

##### durationSeconds

`number`

##### maxDurationSeconds

`number`

##### provider?

`string`

#### Returns

`STTError`

---

### invalidFormat()

> `static` **invalidFormat**(`format`, `supportedFormatsOrProvider?`, `provider?`): `STTError`

Create an error for invalid audio format

#### Parameters

##### format

`string`

##### supportedFormatsOrProvider?

`string` \| `string`[]

##### provider?

`string`

#### Returns

`STTError`

---

### languageNotSupported()

> `static` **languageNotSupported**(`language`, `supportedLanguages?`, `provider?`): `STTError`

Create an error for unsupported language

#### Parameters

##### language

`string`

##### supportedLanguages?

`string`[]

##### provider?

`string`

#### Returns

`STTError`

---

### transcriptionFailed()

> `static` **transcriptionFailed**(`reason`, `providerOrError?`, `originalErrorOrProvider?`): `STTError`

Create an error for transcription failure
Supports two signatures:

- transcriptionFailed(reason, provider?, originalError?)
- transcriptionFailed(reason, originalError, provider)

#### Parameters

##### reason

`string`

##### providerOrError?

`string` \| `Error`

##### originalErrorOrProvider?

`string` \| `Error`

#### Returns

`STTError`

---

### providerNotConfigured()

> `static` **providerNotConfigured**(`provider`): `STTError`

Create an error for unconfigured provider

#### Parameters

##### provider

`string`

#### Returns

`STTError`

---

### providerNotSupported()

> `static` **providerNotSupported**(`provider`, `availableProviders?`): `STTError`

Create an error for unsupported provider

#### Parameters

##### provider

`string`

##### availableProviders?

`string`[]

#### Returns

`STTError`

---

### streamError()

> `static` **streamError**(`reason`, `provider?`): `STTError`

Create an error for stream processing failure

#### Parameters

##### reason

`string`

##### provider?

`string`

#### Returns

`STTError`

---

### notConfigured()

> `static` **notConfigured**(`provider`): `STTError`

Alias for providerNotConfigured

#### Parameters

##### provider

`string`

#### Returns

`STTError`

---

### emptyAudio()

> `static` **emptyAudio**(`provider?`): `STTError`

Alias for audioEmpty

#### Parameters

##### provider?

`string`

#### Returns

`STTError`
