[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIRealtime

# Class: OpenAIRealtime

Defined in: [voice/providers/OpenAIRealtime.ts:31](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L31)

OpenAI Realtime API Handler

Implements bidirectional voice communication with OpenAI's Realtime API.

## See

https://platform.openai.com/docs/api-reference/realtime

## Extends

- [`BaseRealtimeHandler`](BaseRealtimeHandler.md)

## Constructors

### Constructor

> **new OpenAIRealtime**(`apiKey?`): `OpenAIRealtime`

Defined in: [voice/providers/OpenAIRealtime.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L38)

#### Parameters

##### apiKey?

`string`

#### Returns

`OpenAIRealtime`

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`constructor`](BaseRealtimeHandler.md#constructor)

## Properties

### session

> `protected` **session**: [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null` = `null`

Defined in: [voice/RealtimeVoiceAPI.ts:432](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L432)

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`session`](BaseRealtimeHandler.md#session)

---

### eventHandlers

> `protected` **eventHandlers**: [`RealtimeEventHandlers`](../type-aliases/RealtimeEventHandlers.md) \| `null` = `null`

Defined in: [voice/RealtimeVoiceAPI.ts:433](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L433)

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`eventHandlers`](BaseRealtimeHandler.md#eventhandlers)

---

### state

> `protected` **state**: [`RealtimeSessionState`](../type-aliases/RealtimeSessionState.md) = `"disconnected"`

Defined in: [voice/RealtimeVoiceAPI.ts:434](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L434)

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`state`](BaseRealtimeHandler.md#state)

---

### name

> `readonly` **name**: `"openai-realtime"` = `"openai-realtime"`

Defined in: [voice/providers/OpenAIRealtime.ts:32](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L32)

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`name`](BaseRealtimeHandler.md#name)

## Methods

### isConnected()

> **isConnected**(): `boolean`

Defined in: [voice/RealtimeVoiceAPI.ts:442](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L442)

#### Returns

`boolean`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`isConnected`](BaseRealtimeHandler.md#isconnected)

---

### getSession()

> **getSession**(): [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

Defined in: [voice/RealtimeVoiceAPI.ts:446](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L446)

#### Returns

[`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`getSession`](BaseRealtimeHandler.md#getsession)

---

### on()

> **on**(`handlers`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:450](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L450)

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

Defined in: [voice/RealtimeVoiceAPI.ts:454](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L454)

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`off`](BaseRealtimeHandler.md#off)

---

### emitStateChange()

> `protected` **emitStateChange**(`newState`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:461](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L461)

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

Defined in: [voice/RealtimeVoiceAPI.ts:473](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L473)

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

Defined in: [voice/RealtimeVoiceAPI.ts:480](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L480)

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

Defined in: [voice/RealtimeVoiceAPI.ts:487](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L487)

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

Defined in: [voice/RealtimeVoiceAPI.ts:494](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L494)

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

Defined in: [voice/RealtimeVoiceAPI.ts:507](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L507)

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

Defined in: [voice/RealtimeVoiceAPI.ts:514](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L514)

Emit turn start event

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitTurnStart`](BaseRealtimeHandler.md#emitturnstart)

---

### emitTurnEnd()

> `protected` **emitTurnEnd**(): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:521](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L521)

Emit turn end event

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitTurnEnd`](BaseRealtimeHandler.md#emitturnend)

---

### createSession()

> `protected` **createSession**(`id`, `config`): [`RealtimeSession`](../type-aliases/RealtimeSession.md)

Defined in: [voice/RealtimeVoiceAPI.ts:528](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/RealtimeVoiceAPI.ts#L528)

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

Defined in: [voice/providers/OpenAIRealtime.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L48)

#### Returns

`boolean`

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`isConfigured`](BaseRealtimeHandler.md#isconfigured)

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

Defined in: [voice/providers/OpenAIRealtime.ts:52](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L52)

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`getSupportedFormats`](BaseRealtimeHandler.md#getsupportedformats)

---

### connect()

> **connect**(`config`): `Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

Defined in: [voice/providers/OpenAIRealtime.ts:59](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L59)

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

Defined in: [voice/providers/OpenAIRealtime.ts:145](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L145)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`disconnect`](BaseRealtimeHandler.md#disconnect)

---

### sendAudio()

> **sendAudio**(`audio`): `Promise`\<`void`\>

Defined in: [voice/providers/OpenAIRealtime.ts:170](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L170)

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

Defined in: [voice/providers/OpenAIRealtime.ts:186](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L186)

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

---

### triggerResponse()

> **triggerResponse**(): `Promise`\<`void`\>

Defined in: [voice/providers/OpenAIRealtime.ts:212](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L212)

#### Returns

`Promise`\<`void`\>

---

### cancelResponse()

> **cancelResponse**(): `Promise`\<`void`\>

Defined in: [voice/providers/OpenAIRealtime.ts:232](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAIRealtime.ts#L232)

#### Returns

`Promise`\<`void`\>
