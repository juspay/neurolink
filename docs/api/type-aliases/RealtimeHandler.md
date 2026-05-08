[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeHandler

# Type Alias: RealtimeHandler

> **RealtimeHandler** = `object`

Defined in: [types/realtime.ts:249](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L249)

## Properties

### name

> `readonly` **name**: `string`

Defined in: [types/realtime.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L250)

## Methods

### connect()

> **connect**(`config`): `Promise`\<[`RealtimeSession`](RealtimeSession.md)\>

Defined in: [types/realtime.ts:251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L251)

#### Parameters

##### config

[`RealtimeConfig`](RealtimeConfig.md)

#### Returns

`Promise`\<[`RealtimeSession`](RealtimeSession.md)\>

---

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [types/realtime.ts:252](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L252)

#### Returns

`Promise`\<`void`\>

---

### isConnected()

> **isConnected**(): `boolean`

Defined in: [types/realtime.ts:253](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L253)

#### Returns

`boolean`

---

### getSession()

> **getSession**(): [`RealtimeSession`](RealtimeSession.md) \| `null`

Defined in: [types/realtime.ts:254](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L254)

#### Returns

[`RealtimeSession`](RealtimeSession.md) \| `null`

---

### sendAudio()

> **sendAudio**(`audio`): `Promise`\<`void`\>

Defined in: [types/realtime.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L255)

#### Parameters

##### audio

`Buffer`\<`ArrayBufferLike`\> \| [`RealtimeAudioChunk`](RealtimeAudioChunk.md)

#### Returns

`Promise`\<`void`\>

---

### sendText()?

> `optional` **sendText**(`text`): `Promise`\<`void`\>

Defined in: [types/realtime.ts:256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L256)

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

---

### triggerResponse()?

> `optional` **triggerResponse**(): `Promise`\<`void`\>

Defined in: [types/realtime.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L257)

#### Returns

`Promise`\<`void`\>

---

### cancelResponse()?

> `optional` **cancelResponse**(): `Promise`\<`void`\>

Defined in: [types/realtime.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L258)

#### Returns

`Promise`\<`void`\>

---

### on()

> **on**(`handlers`): `void`

Defined in: [types/realtime.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L259)

#### Parameters

##### handlers

[`RealtimeEventHandlers`](RealtimeEventHandlers.md)

#### Returns

`void`

---

### off()

> **off**(): `void`

Defined in: [types/realtime.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L260)

#### Returns

`void`

---

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [types/realtime.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L261)

#### Returns

`boolean`

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](TTSAudioFormat.md)[]

Defined in: [types/realtime.ts:262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L262)

#### Returns

[`TTSAudioFormat`](TTSAudioFormat.md)[]
