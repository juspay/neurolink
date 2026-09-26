[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitBridgeRoom

# Type Alias: LiveKitBridgeRoom

> **LiveKitBridgeRoom** = `object`

Minimal structural view of the LiveKit room the bridge needs: a local
participant to publish on, and event (un)subscription. Declared structurally
so `src/lib/types` carries no dependency on `@livekit/rtc-node`; the real
`Room` from a job context satisfies this shape.

## Properties

### localParticipant?

> `optional` **localParticipant?**: `object`

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

#### Parameters

##### event

`string`

##### listener

(...`args`) => `void`

#### Returns

`unknown`
