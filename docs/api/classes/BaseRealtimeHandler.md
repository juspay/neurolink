[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseRealtimeHandler

# Abstract Class: BaseRealtimeHandler

Base Realtime Handler with common functionality

Providers can extend this class for common behavior.

## Extended by

- [`GeminiLive`](GeminiLive.md)
- [`OpenAIRealtime`](OpenAIRealtime.md)

## Implements

- [`RealtimeHandler`](../type-aliases/RealtimeHandler.md)

## Constructors

### Constructor

> **new BaseRealtimeHandler**(): `BaseRealtimeHandler`

#### Returns

`BaseRealtimeHandler`

## Properties

### name

> `abstract` `readonly` **name**: `"openai-realtime"` \| `"gemini-live"`

#### Implementation of

`RealtimeHandler.name`

---

### session

> `protected` **session**: [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null` = `null`

---

### eventHandlers

> `protected` **eventHandlers**: [`RealtimeEventHandlers`](../type-aliases/RealtimeEventHandlers.md) \| `null` = `null`

---

### state

> `protected` **state**: [`RealtimeSessionState`](../type-aliases/RealtimeSessionState.md) = `"disconnected"`

## Methods

### connect()

> `abstract` **connect**(`config`): `Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

#### Parameters

##### config

[`RealtimeConfig`](../type-aliases/RealtimeConfig.md)

#### Returns

`Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

#### Implementation of

`RealtimeHandler.connect`

---

### disconnect()

> `abstract` **disconnect**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RealtimeHandler.disconnect`

---

### sendAudio()

> `abstract` **sendAudio**(`audio`): `Promise`\<`void`\>

#### Parameters

##### audio

`Buffer`\<`ArrayBufferLike`\> \| [`RealtimeAudioChunk`](../type-aliases/RealtimeAudioChunk.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RealtimeHandler.sendAudio`

---

### isConfigured()

> `abstract` **isConfigured**(): `boolean`

#### Returns

`boolean`

#### Implementation of

`RealtimeHandler.isConfigured`

---

### getSupportedFormats()

> `abstract` **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Implementation of

`RealtimeHandler.getSupportedFormats`

---

### isConnected()

> **isConnected**(): `boolean`

#### Returns

`boolean`

#### Implementation of

`RealtimeHandler.isConnected`

---

### getSession()

> **getSession**(): [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

#### Returns

[`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

#### Implementation of

`RealtimeHandler.getSession`

---

### on()

> **on**(`handlers`): `void`

#### Parameters

##### handlers

[`RealtimeEventHandlers`](../type-aliases/RealtimeEventHandlers.md)

#### Returns

`void`

#### Implementation of

`RealtimeHandler.on`

---

### off()

> **off**(): `void`

#### Returns

`void`

#### Implementation of

`RealtimeHandler.off`

---

### emitStateChange()

> `protected` **emitStateChange**(`newState`): `void`

Emit state change event

#### Parameters

##### newState

[`RealtimeSessionState`](../type-aliases/RealtimeSessionState.md)

#### Returns

`void`

---

### emitAudio()

> `protected` **emitAudio**(`chunk`): `void`

Emit audio event

#### Parameters

##### chunk

[`RealtimeAudioChunk`](../type-aliases/RealtimeAudioChunk.md)

#### Returns

`void`

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

---

### emitError()

> `protected` **emitError**(`error`): `void`

Emit error event

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### emitTurnStart()

> `protected` **emitTurnStart**(): `void`

Emit turn start event

#### Returns

`void`

---

### emitTurnEnd()

> `protected` **emitTurnEnd**(): `void`

Emit turn end event

#### Returns

`void`

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
