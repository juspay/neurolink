[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketMessageRouter

# Class: WebSocketMessageRouter

WebSocket message router for handling different message types

## Constructors

### Constructor

> **new WebSocketMessageRouter**(): `WebSocketMessageRouter`

#### Returns

`WebSocketMessageRouter`

## Methods

### route()

> **route**(`type`, `handler`): `void`

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

Get registered routes

#### Returns

`string`[]
