[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationProtocolAdapter

# Class: ElicitationProtocolAdapter

Elicitation Protocol Adapter

Bridges protocol-level messages with the ElicitationManager

## Constructors

### Constructor

> **new ElicitationProtocolAdapter**(`config?`): `ElicitationProtocolAdapter`

#### Parameters

##### config?

[`ElicitationProtocolAdapterConfig`](../type-aliases/ElicitationProtocolAdapterConfig.md) = `{}`

#### Returns

`ElicitationProtocolAdapter`

## Methods

### handleMessage()

> **handleMessage**(`message`): `Promise`\<`void` \| [`ElicitationProtocolPayload`](../type-aliases/ElicitationProtocolPayload.md)\>

Handle incoming protocol message

#### Parameters

##### message

[`ElicitationProtocolPayload`](../type-aliases/ElicitationProtocolPayload.md)

#### Returns

`Promise`\<`void` \| [`ElicitationProtocolPayload`](../type-aliases/ElicitationProtocolPayload.md)\>

---

### requestElicitation()

> **requestElicitation**(`params`): `Promise`\<[`ElicitationResponse`](../type-aliases/ElicitationResponse.md)\>

Send an elicitation request through the protocol

#### Parameters

##### params

[`ElicitationRequestParams`](../type-aliases/ElicitationRequestParams.md)

#### Returns

`Promise`\<[`ElicitationResponse`](../type-aliases/ElicitationResponse.md)\>

---

### cancelElicitation()

> **cancelElicitation**(`requestId`, `reason?`): `void`

Cancel a pending elicitation

#### Parameters

##### requestId

`string`

##### reason?

`string`

#### Returns

`void`

---

### getManager()

> **getManager**(): [`ElicitationManager`](ElicitationManager.md)

Get the underlying manager

#### Returns

[`ElicitationManager`](ElicitationManager.md)

---

### setHandler()

> **setHandler**(`handler`): `void`

Set protocol handler for the manager

#### Parameters

##### handler

[`ElicitationHandler`](../type-aliases/ElicitationHandler.md)

#### Returns

`void`

---

### setEnabled()

> **setEnabled**(`enabled`): `void`

Enable/disable the protocol

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

---

### isEnabled()

> **isEnabled**(): `boolean`

Check if protocol is enabled

#### Returns

`boolean`
