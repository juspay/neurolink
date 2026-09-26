[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeHandler

# Type Alias: RealtimeHandler

> **RealtimeHandler** = `object`

## Properties

### name

> `readonly` **name**: `string`

## Methods

### connect()

> **connect**(`config`): `Promise`\<[`RealtimeSession`](RealtimeSession.md)\>

#### Parameters

##### config

[`RealtimeConfig`](RealtimeConfig.md)

#### Returns

`Promise`\<[`RealtimeSession`](RealtimeSession.md)\>

---

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### isConnected()

> **isConnected**(): `boolean`

#### Returns

`boolean`

---

### getSession()

> **getSession**(): [`RealtimeSession`](RealtimeSession.md) \| `null`

#### Returns

[`RealtimeSession`](RealtimeSession.md) \| `null`

---

### sendAudio()

> **sendAudio**(`audio`): `Promise`\<`void`\>

#### Parameters

##### audio

`Buffer`\<`ArrayBufferLike`\> \| [`RealtimeAudioChunk`](RealtimeAudioChunk.md)

#### Returns

`Promise`\<`void`\>

---

### sendText()?

> `optional` **sendText**(`text`): `Promise`\<`void`\>

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

---

### triggerResponse()?

> `optional` **triggerResponse**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### cancelResponse()?

> `optional` **cancelResponse**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### on()

> **on**(`handlers`): `void`

#### Parameters

##### handlers

[`RealtimeEventHandlers`](RealtimeEventHandlers.md)

#### Returns

`void`

---

### off()

> **off**(): `void`

#### Returns

`void`

---

### isConfigured()

> **isConfigured**(): `boolean`

#### Returns

`boolean`

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](TTSAudioFormat.md)[]

#### Returns

[`TTSAudioFormat`](TTSAudioFormat.md)[]
