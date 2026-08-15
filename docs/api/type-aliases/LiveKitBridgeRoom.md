[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitBridgeRoom

# Type Alias: LiveKitBridgeRoom

> **LiveKitBridgeRoom** = `object`

Defined in: [types/livekit.ts:364](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L364)

Minimal structural view of the LiveKit room the bridge needs: a local
participant to publish on, and event (un)subscription. Declared structurally
so `src/lib/types` carries no dependency on `@livekit/rtc-node`; the real
`Room` from a job context satisfies this shape.

## Properties

### localParticipant?

> `optional` **localParticipant?**: `object`

Defined in: [types/livekit.ts:365](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L365)

#### publishData()

> **publishData**(`data`, `options`): `Promise`\<`void`\>

##### Parameters

###### data

`Uint8Array`

###### options

###### reliable?

`boolean`

###### topic?

`string`

##### Returns

`Promise`\<`void`\>

#### sendText()

> **sendText**(`text`, `options?`): `Promise`\<`unknown`\>

##### Parameters

###### text

`string`

###### options?

###### topic?

`string`

##### Returns

`Promise`\<`unknown`\>

## Methods

### on()

> **on**(`event`, `listener`): `unknown`

Defined in: [types/livekit.ts:375](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L375)

#### Parameters

##### event

`string`

##### listener

(...`args`) => `void`

#### Returns

`unknown`

---

### off()

> **off**(`event`, `listener`): `unknown`

Defined in: [types/livekit.ts:376](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L376)

#### Parameters

##### event

`string`

##### listener

(...`args`) => `void`

#### Returns

`unknown`
