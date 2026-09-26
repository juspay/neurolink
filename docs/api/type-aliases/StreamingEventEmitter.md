[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingEventEmitter

# Type Alias: StreamingEventEmitter

> **StreamingEventEmitter** = `object`

Streaming event emitter interface

## Methods

### on()

#### Call Signature

> **on**(`event`, `callback`): `void`

##### Parameters

###### event

`"text"`

###### callback

(`text`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

##### Parameters

###### event

`"tool-call"`

###### callback

(`toolCall`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

##### Parameters

###### event

`"tool-result"`

###### callback

(`toolResult`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

##### Parameters

###### event

`"error"`

###### callback

(`error`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

##### Parameters

###### event

`"done"`

###### callback

(`result`) => `void`

##### Returns

`void`

#### Call Signature

> **on**(`event`, `callback`): `void`

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

#### Parameters

##### event

`string`

##### args

...`unknown`[]

#### Returns

`void`
