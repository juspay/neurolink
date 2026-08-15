[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiLive

# Class: GeminiLive

Defined in: [voice/providers/GeminiLive.ts:29](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L29)

Google Gemini Live Voice API Handler

Implements bidirectional voice communication with Gemini's Live API.

## See

https://ai.google.dev/gemini-api/docs/live

## Extends

- [`BaseRealtimeHandler`](BaseRealtimeHandler.md)

## Constructors

### Constructor

> **new GeminiLive**(`apiKey?`): `GeminiLive`

Defined in: [voice/providers/GeminiLive.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L37)

#### Parameters

##### apiKey?

`string`

#### Returns

`GeminiLive`

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`constructor`](BaseRealtimeHandler.md#constructor)

## Properties

### session

> `protected` **session**: [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null` = `null`

Defined in: [voice/RealtimeVoiceAPI.ts:432](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L432)

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`session`](BaseRealtimeHandler.md#session)

---

### eventHandlers

> `protected` **eventHandlers**: [`RealtimeEventHandlers`](../type-aliases/RealtimeEventHandlers.md) \| `null` = `null`

Defined in: [voice/RealtimeVoiceAPI.ts:433](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L433)

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`eventHandlers`](BaseRealtimeHandler.md#eventhandlers)

---

### state

> `protected` **state**: [`RealtimeSessionState`](../type-aliases/RealtimeSessionState.md) = `"disconnected"`

Defined in: [voice/RealtimeVoiceAPI.ts:434](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L434)

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`state`](BaseRealtimeHandler.md#state)

---

### name

> `readonly` **name**: `"gemini-live"` = `"gemini-live"`

Defined in: [voice/providers/GeminiLive.ts:30](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L30)

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`name`](BaseRealtimeHandler.md#name)

## Methods

### isConnected()

> **isConnected**(): `boolean`

Defined in: [voice/RealtimeVoiceAPI.ts:442](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L442)

#### Returns

`boolean`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`isConnected`](BaseRealtimeHandler.md#isconnected)

---

### getSession()

> **getSession**(): [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

Defined in: [voice/RealtimeVoiceAPI.ts:446](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L446)

#### Returns

[`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`getSession`](BaseRealtimeHandler.md#getsession)

---

### on()

> **on**(`handlers`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:450](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L450)

#### Parameters

##### handlers

[`RealtimeEventHandlers`](../type-aliases/RealtimeEventHandlers.md)

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`on`](BaseRealtimeHandler.md#on)

---

### off()

> **off**(): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:454](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L454)

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`off`](BaseRealtimeHandler.md#off)

---

### emitStateChange()

> `protected` **emitStateChange**(`newState`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:461](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L461)

Emit state change event

#### Parameters

##### newState

[`RealtimeSessionState`](../type-aliases/RealtimeSessionState.md)

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitStateChange`](BaseRealtimeHandler.md#emitstatechange)

---

### emitAudio()

> `protected` **emitAudio**(`chunk`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:473](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L473)

Emit audio event

#### Parameters

##### chunk

[`RealtimeAudioChunk`](../type-aliases/RealtimeAudioChunk.md)

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitAudio`](BaseRealtimeHandler.md#emitaudio)

---

### emitTranscript()

> `protected` **emitTranscript**(`text`, `isFinal`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:480](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L480)

Emit transcript event

#### Parameters

##### text

`string`

##### isFinal

`boolean`

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitTranscript`](BaseRealtimeHandler.md#emittranscript)

---

### emitText()

> `protected` **emitText**(`text`, `isFinal`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:487](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L487)

Emit text event

#### Parameters

##### text

`string`

##### isFinal

`boolean`

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitText`](BaseRealtimeHandler.md#emittext)

---

### emitFunctionCall()

> `protected` **emitFunctionCall**(`name`, `args`): `Promise`\<`unknown`\>

Defined in: [voice/RealtimeVoiceAPI.ts:494](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L494)

Emit function call event

#### Parameters

##### name

`string`

##### args

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitFunctionCall`](BaseRealtimeHandler.md#emitfunctioncall)

---

### emitError()

> `protected` **emitError**(`error`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:507](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L507)

Emit error event

#### Parameters

##### error

`Error`

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitError`](BaseRealtimeHandler.md#emiterror)

---

### emitTurnStart()

> `protected` **emitTurnStart**(): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:514](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L514)

Emit turn start event

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitTurnStart`](BaseRealtimeHandler.md#emitturnstart)

---

### emitTurnEnd()

> `protected` **emitTurnEnd**(): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:521](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L521)

Emit turn end event

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitTurnEnd`](BaseRealtimeHandler.md#emitturnend)

---

### createSession()

> `protected` **createSession**(`id`, `config`): [`RealtimeSession`](../type-aliases/RealtimeSession.md)

Defined in: [voice/RealtimeVoiceAPI.ts:528](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/RealtimeVoiceAPI.ts#L528)

Create a session object

#### Parameters

##### id

`string`

##### config

[`RealtimeConfig`](../type-aliases/RealtimeConfig.md)

#### Returns

[`RealtimeSession`](../type-aliases/RealtimeSession.md)

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`createSession`](BaseRealtimeHandler.md#createsession)

---

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [voice/providers/GeminiLive.ts:52](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L52)

#### Returns

`boolean`

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`isConfigured`](BaseRealtimeHandler.md#isconfigured)

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

Defined in: [voice/providers/GeminiLive.ts:56](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L56)

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`getSupportedFormats`](BaseRealtimeHandler.md#getsupportedformats)

---

### connect()

> **connect**(`config`): `Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

Defined in: [voice/providers/GeminiLive.ts:60](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L60)

#### Parameters

##### config

[`RealtimeConfig`](../type-aliases/RealtimeConfig.md)

#### Returns

`Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`connect`](BaseRealtimeHandler.md#connect)

---

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [voice/providers/GeminiLive.ts:163](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L163)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`disconnect`](BaseRealtimeHandler.md#disconnect)

---

### sendAudio()

> **sendAudio**(`audio`): `Promise`\<`void`\>

Defined in: [voice/providers/GeminiLive.ts:189](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L189)

#### Parameters

##### audio

`Buffer`\<`ArrayBufferLike`\> \| [`RealtimeAudioChunk`](../type-aliases/RealtimeAudioChunk.md)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`sendAudio`](BaseRealtimeHandler.md#sendaudio)

---

### sendText()

> **sendText**(`text`): `Promise`\<`void`\>

Defined in: [voice/providers/GeminiLive.ts:211](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L211)

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

---

### triggerResponse()

> **triggerResponse**(): `Promise`\<`void`\>

Defined in: [voice/providers/GeminiLive.ts:232](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L232)

#### Returns

`Promise`\<`void`\>

---

### cancelResponse()

> **cancelResponse**(): `Promise`\<`void`\>

Defined in: [voice/providers/GeminiLive.ts:237](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/providers/GeminiLive.ts#L237)

#### Returns

`Promise`\<`void`\>
