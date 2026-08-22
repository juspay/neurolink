[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseRealtimeHandler

# Abstract Class: BaseRealtimeHandler

Defined in: [voice/RealtimeVoiceAPI.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L425)

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

Defined in: [voice/RealtimeVoiceAPI.ts:430](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L430)

#### Implementation of

`RealtimeHandler.name`

---

### session

> `protected` **session**: [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null` = `null`

Defined in: [voice/RealtimeVoiceAPI.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L432)

---

### eventHandlers

> `protected` **eventHandlers**: [`RealtimeEventHandlers`](../type-aliases/RealtimeEventHandlers.md) \| `null` = `null`

Defined in: [voice/RealtimeVoiceAPI.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L433)

---

### state

> `protected` **state**: [`RealtimeSessionState`](../type-aliases/RealtimeSessionState.md) = `"disconnected"`

Defined in: [voice/RealtimeVoiceAPI.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L434)

## Methods

### connect()

> `abstract` **connect**(`config`): `Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

Defined in: [voice/RealtimeVoiceAPI.ts:436](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L436)

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

Defined in: [voice/RealtimeVoiceAPI.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L437)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RealtimeHandler.disconnect`

---

### sendAudio()

> `abstract` **sendAudio**(`audio`): `Promise`\<`void`\>

Defined in: [voice/RealtimeVoiceAPI.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L438)

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

Defined in: [voice/RealtimeVoiceAPI.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L439)

#### Returns

`boolean`

#### Implementation of

`RealtimeHandler.isConfigured`

---

### getSupportedFormats()

> `abstract` **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

Defined in: [voice/RealtimeVoiceAPI.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L440)

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Implementation of

`RealtimeHandler.getSupportedFormats`

---

### isConnected()

> **isConnected**(): `boolean`

Defined in: [voice/RealtimeVoiceAPI.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L442)

#### Returns

`boolean`

#### Implementation of

`RealtimeHandler.isConnected`

---

### getSession()

> **getSession**(): [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

Defined in: [voice/RealtimeVoiceAPI.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L446)

#### Returns

[`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

#### Implementation of

`RealtimeHandler.getSession`

---

### on()

> **on**(`handlers`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L450)

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

Defined in: [voice/RealtimeVoiceAPI.ts:454](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L454)

#### Returns

`void`

#### Implementation of

`RealtimeHandler.off`

---

### emitStateChange()

> `protected` **emitStateChange**(`newState`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:461](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L461)

Emit state change event

#### Parameters

##### newState

[`RealtimeSessionState`](../type-aliases/RealtimeSessionState.md)

#### Returns

`void`

---

### emitAudio()

> `protected` **emitAudio**(`chunk`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L473)

Emit audio event

#### Parameters

##### chunk

[`RealtimeAudioChunk`](../type-aliases/RealtimeAudioChunk.md)

#### Returns

`void`

---

### emitTranscript()

> `protected` **emitTranscript**(`text`, `isFinal`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:480](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L480)

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

Defined in: [voice/RealtimeVoiceAPI.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L487)

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

Defined in: [voice/RealtimeVoiceAPI.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L494)

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

Defined in: [voice/RealtimeVoiceAPI.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L507)

Emit error event

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### emitTurnStart()

> `protected` **emitTurnStart**(): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:514](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L514)

Emit turn start event

#### Returns

`void`

---

### emitTurnEnd()

> `protected` **emitTurnEnd**(): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:521](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L521)

Emit turn end event

#### Returns

`void`

---

### createSession()

> `protected` **createSession**(`id`, `config`): [`RealtimeSession`](../type-aliases/RealtimeSession.md)

Defined in: [voice/RealtimeVoiceAPI.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L528)

Create a session object

#### Parameters

##### id

`string`

##### config

[`RealtimeConfig`](../type-aliases/RealtimeConfig.md)

#### Returns

[`RealtimeSession`](../type-aliases/RealtimeSession.md)
