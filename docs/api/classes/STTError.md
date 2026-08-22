[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTError

# Class: STTError

Defined in: [voice/errors.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L42)

STT Error class for speech-to-text specific errors

## Extends

- [`VoiceError`](VoiceError.md)

## Constructors

### Constructor

> **new STTError**(`options`): `STTError`

Defined in: [voice/errors.ts:43](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L43)

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

### audioEmpty()

> `static` **audioEmpty**(`provider?`): `STTError`

Defined in: [voice/errors.ts:56](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L56)

Create an error for empty audio input

#### Parameters

##### provider?

`string`

#### Returns

`STTError`

---

### audioTooLong()

> `static` **audioTooLong**(`durationSeconds`, `maxDurationSeconds`, `provider?`): `STTError`

Defined in: [voice/errors.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L70)

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

Defined in: [voice/errors.ts:88](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L88)

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

Defined in: [voice/errors.ts:122](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L122)

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

Defined in: [voice/errors.ts:146](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L146)

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

Defined in: [voice/errors.ts:184](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L184)

Create an error for unconfigured provider

#### Parameters

##### provider

`string`

#### Returns

`STTError`

---

### providerNotSupported()

> `static` **providerNotSupported**(`provider`, `availableProviders?`): `STTError`

Defined in: [voice/errors.ts:198](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L198)

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

Defined in: [voice/errors.ts:215](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L215)

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

Defined in: [voice/errors.ts:229](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L229)

Alias for providerNotConfigured

#### Parameters

##### provider

`string`

#### Returns

`STTError`

---

### emptyAudio()

> `static` **emptyAudio**(`provider?`): `STTError`

Defined in: [voice/errors.ts:236](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/errors.ts#L236)

Alias for audioEmpty

#### Parameters

##### provider?

`string`

#### Returns

`STTError`
