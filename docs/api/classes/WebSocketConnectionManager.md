[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketConnectionManager

# Class: WebSocketConnectionManager

WebSocket connection manager

## Constructors

### Constructor

> **new WebSocketConnectionManager**(`config?`): `WebSocketConnectionManager`

#### Parameters

##### config?

[`WebSocketConfig`](../type-aliases/WebSocketConfig.md) = `{}`

#### Returns

`WebSocketConnectionManager`

## Methods

### registerHandler()

> **registerHandler**(`path`, `handler`): `void`

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

Get handler for a path

#### Parameters

##### path

`string`

#### Returns

[`WebSocketHandler`](../type-aliases/WebSocketHandler.md) \| `undefined`

---

### handleConnection()

> **handleConnection**(`socket`, `path`, `user?`): `Promise`\<[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)\>

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

Get connection by ID

#### Parameters

##### connectionId

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md) \| `undefined`

---

### getAllConnections()

> **getAllConnections**(): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Get all connections

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### getConnectionsByUser()

> **getConnectionsByUser**(`userId`): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Get connections for a user

#### Parameters

##### userId

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### getConnectionsByPath()

> **getConnectionsByPath**(`path`): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Get connections for a path

#### Parameters

##### path

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### send()

> **send**(`connectionId`, `data`): `void`

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

Get connection count

#### Returns

`number`
