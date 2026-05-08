[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationProtocolAdapter

# Class: ElicitationProtocolAdapter

Defined in: [mcp/elicitationProtocol.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L243)

Elicitation Protocol Adapter

Bridges protocol-level messages with the ElicitationManager

## Constructors

### Constructor

> **new ElicitationProtocolAdapter**(`config?`): `ElicitationProtocolAdapter`

Defined in: [mcp/elicitationProtocol.ts:251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L251)

#### Parameters

##### config?

[`ElicitationProtocolAdapterConfig`](../type-aliases/ElicitationProtocolAdapterConfig.md) = `{}`

#### Returns

`ElicitationProtocolAdapter`

## Methods

### handleMessage()

> **handleMessage**(`message`): `Promise`\<`void` \| [`ElicitationProtocolPayload`](../type-aliases/ElicitationProtocolPayload.md)\>

Defined in: [mcp/elicitationProtocol.ts:264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L264)

Handle incoming protocol message

#### Parameters

##### message

[`ElicitationProtocolPayload`](../type-aliases/ElicitationProtocolPayload.md)

#### Returns

`Promise`\<`void` \| [`ElicitationProtocolPayload`](../type-aliases/ElicitationProtocolPayload.md)\>

---

### requestElicitation()

> **requestElicitation**(`params`): `Promise`\<[`ElicitationResponse`](../type-aliases/ElicitationResponse.md)\>

Defined in: [mcp/elicitationProtocol.ts:340](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L340)

Send an elicitation request through the protocol

#### Parameters

##### params

[`ElicitationRequestParams`](../type-aliases/ElicitationRequestParams.md)

#### Returns

`Promise`\<[`ElicitationResponse`](../type-aliases/ElicitationResponse.md)\>

---

### cancelElicitation()

> **cancelElicitation**(`requestId`, `reason?`): `void`

Defined in: [mcp/elicitationProtocol.ts:355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L355)

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

Defined in: [mcp/elicitationProtocol.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L362)

Get the underlying manager

#### Returns

[`ElicitationManager`](ElicitationManager.md)

---

### setHandler()

> **setHandler**(`handler`): `void`

Defined in: [mcp/elicitationProtocol.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L369)

Set protocol handler for the manager

#### Parameters

##### handler

[`ElicitationHandler`](../type-aliases/ElicitationHandler.md)

#### Returns

`void`

---

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [mcp/elicitationProtocol.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L376)

Enable/disable the protocol

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

---

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [mcp/elicitationProtocol.ts:383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L383)

Check if protocol is enabled

#### Returns

`boolean`
