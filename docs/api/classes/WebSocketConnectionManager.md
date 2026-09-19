[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketConnectionManager

# Class: WebSocketConnectionManager

Defined in: [server/websocket/WebSocketHandler.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L47)

WebSocket connection manager

## Constructors

### Constructor

> **new WebSocketConnectionManager**(`config?`): `WebSocketConnectionManager`

Defined in: [server/websocket/WebSocketHandler.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L53)

#### Parameters

##### config?

[`WebSocketConfig`](../type-aliases/WebSocketConfig.md) = `{}`

#### Returns

`WebSocketConnectionManager`

## Methods

### registerHandler()

> **registerHandler**(`path`, `handler`): `void`

Defined in: [server/websocket/WebSocketHandler.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L60)

Register a handler for a path

#### Parameters

##### path

`string`

##### handler

[`WebSocketHandler`](../type-aliases/WebSocketHandler.md)

#### Returns

`void`

---

### getHandler()

> **getHandler**(`path`): [`WebSocketHandler`](../type-aliases/WebSocketHandler.md) \| `undefined`

Defined in: [server/websocket/WebSocketHandler.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L68)

Get handler for a path

#### Parameters

##### path

`string`

#### Returns

[`WebSocketHandler`](../type-aliases/WebSocketHandler.md) \| `undefined`

---

### handleConnection()

> **handleConnection**(`socket`, `path`, `user?`): `Promise`\<[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)\>

Defined in: [server/websocket/WebSocketHandler.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L75)

Handle new connection

#### Parameters

##### socket

`unknown`

##### path

`string`

##### user?

[`AuthenticatedUser`](../type-aliases/AuthenticatedUser.md)

#### Returns

`Promise`\<[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)\>

---

### handleMessage()

> **handleMessage**(`connectionId`, `data`, `isBinary`): `Promise`\<`void`\>

Defined in: [server/websocket/WebSocketHandler.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L140)

Handle incoming message

#### Parameters

##### connectionId

`string`

##### data

`string` \| `ArrayBuffer`

##### isBinary

`boolean`

#### Returns

`Promise`\<`void`\>

---

### handleClose()

> **handleClose**(`connectionId`, `code`, `reason`): `Promise`\<`void`\>

Defined in: [server/websocket/WebSocketHandler.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L187)

Handle connection close

#### Parameters

##### connectionId

`string`

##### code

`number`

##### reason

`string`

#### Returns

`Promise`\<`void`\>

---

### handleError()

> **handleError**(`connectionId`, `error`): `Promise`\<`void`\>

Defined in: [server/websocket/WebSocketHandler.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L224)

Handle connection error

#### Parameters

##### connectionId

`string`

##### error

`Error`

#### Returns

`Promise`\<`void`\>

---

### getConnection()

> **getConnection**(`connectionId`): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md) \| `undefined`

Defined in: [server/websocket/WebSocketHandler.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L251)

Get connection by ID

#### Parameters

##### connectionId

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md) \| `undefined`

---

### getAllConnections()

> **getAllConnections**(): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Defined in: [server/websocket/WebSocketHandler.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L258)

Get all connections

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### getConnectionsByUser()

> **getConnectionsByUser**(`userId`): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Defined in: [server/websocket/WebSocketHandler.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L265)

Get connections for a user

#### Parameters

##### userId

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### getConnectionsByPath()

> **getConnectionsByPath**(`path`): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Defined in: [server/websocket/WebSocketHandler.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L274)

Get connections for a path

#### Parameters

##### path

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### send()

> **send**(`connectionId`, `data`): `void`

Defined in: [server/websocket/WebSocketHandler.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L283)

Send message to a connection

#### Parameters

##### connectionId

`string`

##### data

`string` \| `ArrayBuffer`

#### Returns

`void`

---

### broadcast()

> **broadcast**(`data`, `filter?`): `void`

Defined in: [server/websocket/WebSocketHandler.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L307)

Broadcast message to all connections

#### Parameters

##### data

`string` \| `ArrayBuffer`

##### filter?

(`conn`) => `boolean`

#### Returns

`void`

---

### close()

> **close**(`connectionId`, `code?`, `reason?`): `Promise`\<`void`\>

Defined in: [server/websocket/WebSocketHandler.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L329)

Close a connection

#### Parameters

##### connectionId

`string`

##### code?

`number` = `1000`

##### reason?

`string` = `"Normal closure"`

#### Returns

`Promise`\<`void`\>

---

### closeAll()

> **closeAll**(`code?`, `reason?`): `Promise`\<`void`\>

Defined in: [server/websocket/WebSocketHandler.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L357)

Close all connections

#### Parameters

##### code?

`number` = `1001`

##### reason?

`string` = `"Server shutdown"`

#### Returns

`Promise`\<`void`\>

---

### getConnectionCount()

> **getConnectionCount**(): `number`

Defined in: [server/websocket/WebSocketHandler.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L367)

Get connection count

#### Returns

`number`
