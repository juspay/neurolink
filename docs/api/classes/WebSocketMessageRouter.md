[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketMessageRouter

# Class: WebSocketMessageRouter

Defined in: [server/websocket/WebSocketHandler.ts:396](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/websocket/WebSocketHandler.ts#L396)

WebSocket message router for handling different message types

## Constructors

### Constructor

> **new WebSocketMessageRouter**(): `WebSocketMessageRouter`

#### Returns

`WebSocketMessageRouter`

## Methods

### route()

> **route**(`type`, `handler`): `void`

Defined in: [server/websocket/WebSocketHandler.ts:405](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/websocket/WebSocketHandler.ts#L405)

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

Defined in: [server/websocket/WebSocketHandler.ts:418](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/websocket/WebSocketHandler.ts#L418)

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

Defined in: [server/websocket/WebSocketHandler.ts:450](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/websocket/WebSocketHandler.ts#L450)

Get registered routes

#### Returns

`string`[]
