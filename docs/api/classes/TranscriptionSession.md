[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscriptionSession

# Class: TranscriptionSession

## Constructors

### Constructor

> **new TranscriptionSession**(`neurolink`, `options?`): `TranscriptionSession`

#### Parameters

##### neurolink

`Pick`\<[`NeuroLink`](NeuroLink.md), `"transcribeStream"`\>

##### options?

[`TranscriptionSessionOptions`](../type-aliases/TranscriptionSessionOptions.md) = `{}`

#### Returns

`TranscriptionSession`

## Properties

### id

> `readonly` **id**: `string`

## Accessors

### listenerCount

#### Get Signature

> **get** **listenerCount**(): `number`

##### Returns

`number`

---

### isClosed

#### Get Signature

> **get** **isClosed**(): `boolean`

##### Returns

`boolean`

## Methods

### languages()

> **languages**(): `string`[]

The output languages listeners read now, in order of first request, capped.

#### Returns

`string`[]

---

### activeSpeakers()

> **activeSpeakers**(): `string`[]

Speakers whose audio is being transcribed now.

#### Returns

`string`[]

---

### addSpeaker()

> **addSpeaker**(`speaker`, `options`, `onEvent?`): `Promise`\<`void`\>

Transcribe one speaker until its audio ends (or the session closes).
Every event goes to the session's listeners; `onEvent`, when given, sees
them too (the speaker's own captions). The speaker's own
`output.languages`, if any, are rendered in addition to the listeners'.

#### Parameters

##### speaker

`string`

##### options

[`TranscribeStreamOptions`](../type-aliases/TranscribeStreamOptions.md)

##### onEvent?

(`event`) => `void`

#### Returns

`Promise`\<`void`\>

---

### subscribe()

> **subscribe**(`options`, `onEvent`): [`TranscriptionSubscription`](../type-aliases/TranscriptionSubscription.md)

Follow the session. With `backlog` (the default), the last utterances are replayed first.

#### Parameters

##### options

[`TranscriptionSubscriberOptions`](../type-aliases/TranscriptionSubscriberOptions.md)

##### onEvent

(`event`) => `void`

#### Returns

[`TranscriptionSubscription`](../type-aliases/TranscriptionSubscription.md)

---

### close()

> **close**(): `void`

Stop delivering; speakers' streams end at their next event.

#### Returns

`void`
