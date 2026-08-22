[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingEventEmitter

# Type Alias: StreamingEventEmitter

> **StreamingEventEmitter** = `object`

Defined in: [types/client.ts:1527](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1527)

Streaming event emitter interface

## Methods

### on()

#### Call Signature

> **on**(`event`, `callback`): `void`

Defined in: [types/client.ts:1528](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1528)

##### Parameters

###### event

`"text"`

###### callback

(`text`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

Defined in: [types/client.ts:1529](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1529)

##### Parameters

###### event

`"tool-call"`

###### callback

(`toolCall`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

Defined in: [types/client.ts:1530](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1530)

##### Parameters

###### event

`"tool-result"`

###### callback

(`toolResult`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

Defined in: [types/client.ts:1534](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1534)

##### Parameters

###### event

`"error"`

###### callback

(`error`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

Defined in: [types/client.ts:1535](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1535)

##### Parameters

###### event

`"done"`

###### callback

(`result`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

Defined in: [types/client.ts:1536](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1536)

##### Parameters

###### event

`"metadata"`

###### callback

(`metadata`) => `void`

##### Returns

`void`

---

### off()

> **off**(`event`, `callback`): `void`

Defined in: [types/client.ts:1537](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1537)

#### Parameters

##### event

`string`

##### callback

(...`args`) => `void`

#### Returns

`void`

---

### emit()

> **emit**(`event`, ...`args`): `void`

Defined in: [types/client.ts:1538](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1538)

#### Parameters

##### event

`string`

##### args

...`unknown`[]

#### Returns

`void`
