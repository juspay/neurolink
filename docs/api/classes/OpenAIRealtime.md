[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIRealtime

# Class: OpenAIRealtime

OpenAI Realtime API Handler

Implements bidirectional voice communication with OpenAI's Realtime API.

## See

https://platform.openai.com/docs/api-reference/realtime

## Extends

- [`BaseRealtimeHandler`](BaseRealtimeHandler.md)

## Constructors

### Constructor

> **new OpenAIRealtime**(`apiKey?`): `OpenAIRealtime`

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

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`session`](BaseRealtimeHandler.md#session)

---

### eventHandlers

> `protected` **eventHandlers**: [`RealtimeEventHandlers`](../type-aliases/RealtimeEventHandlers.md) \| `null` = `null`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`eventHandlers`](BaseRealtimeHandler.md#eventhandlers)

---

### state

> `protected` **state**: [`RealtimeSessionState`](../type-aliases/RealtimeSessionState.md) = `"disconnected"`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`state`](BaseRealtimeHandler.md#state)

---

### name

> `readonly` **name**: `"openai-realtime"` = `"openai-realtime"`

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`name`](BaseRealtimeHandler.md#name)

## Methods

### isConnected()

> **isConnected**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`isConnected`](BaseRealtimeHandler.md#isconnected)

---

### getSession()

> **getSession**(): [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

#### Returns

[`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`getSession`](BaseRealtimeHandler.md#getsession)

---

### on()

> **on**(`handlers`): `void`

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

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`off`](BaseRealtimeHandler.md#off)

---

### emitStateChange()

> `protected` **emitStateChange**(`newState`): `void`

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

Emit turn start event

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitTurnStart`](BaseRealtimeHandler.md#emitturnstart)

---

### emitTurnEnd()

> `protected` **emitTurnEnd**(): `void`

Emit turn end event

#### Returns

`void`

#### Inherited from

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`emitTurnEnd`](BaseRealtimeHandler.md#emitturnend)

---

### createSession()

> `protected` **createSession**(`id`, `config`): [`RealtimeSession`](../type-aliases/RealtimeSession.md)

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

#### Returns

`boolean`

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`isConfigured`](BaseRealtimeHandler.md#isconfigured)

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`getSupportedFormats`](BaseRealtimeHandler.md#getsupportedformats)

---

### connect()

> **connect**(`config`): `Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

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

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseRealtimeHandler`](BaseRealtimeHandler.md).[`disconnect`](BaseRealtimeHandler.md#disconnect)

---

### sendAudio()

> **sendAudio**(`audio`): `Promise`\<`void`\>

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

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

---

### triggerResponse()

> **triggerResponse**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### cancelResponse()

> **cancelResponse**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
