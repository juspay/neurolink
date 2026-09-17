[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketMessageRouter

# Class: WebSocketMessageRouter

Defined in: [server/websocket/WebSocketHandler.ts:419](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L419)

WebSocket message router for handling different message types

## Constructors

### Constructor

> **new WebSocketMessageRouter**(): `WebSocketMessageRouter`

#### Returns

`WebSocketMessageRouter`

## Methods

### route()

> **route**(`type`, `handler`): `void`

Defined in: [server/websocket/WebSocketHandler.ts:428](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L428)

Register a message route

#### Parameters

##### type

`string`

##### handler

(`connection`, `payload`) => `Promise`\<`unknown`\>

#### Returns

`void`

---

### handle()

> **handle**(`connection`, `message`): `Promise`\<`unknown`\>

Defined in: [server/websocket/WebSocketHandler.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L441)

Handle incoming message

#### Parameters

##### connection

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)

##### message

[`WebSocketMessage`](../type-aliases/WebSocketMessage.md)

#### Returns

`Promise`\<`unknown`\>

---

### getRoutes()

> **getRoutes**(): `string`[]

Defined in: [server/websocket/WebSocketHandler.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L473)

Get registered routes

#### Returns

`string`[]
