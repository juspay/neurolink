[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketConnectionManager

# Class: WebSocketConnectionManager

Defined in: [server/websocket/WebSocketHandler.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L44)

WebSocket connection manager

## Constructors

### Constructor

> **new WebSocketConnectionManager**(`config?`): `WebSocketConnectionManager`

Defined in: [server/websocket/WebSocketHandler.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L50)

#### Parameters

##### config?

[`WebSocketConfig`](../type-aliases/WebSocketConfig.md) = `{}`

#### Returns

`WebSocketConnectionManager`

## Methods

### registerHandler()

> **registerHandler**(`path`, `handler`): `void`

Defined in: [server/websocket/WebSocketHandler.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L57)

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

Defined in: [server/websocket/WebSocketHandler.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L65)

Get handler for a path

#### Parameters

##### path

`string`

#### Returns

[`WebSocketHandler`](../type-aliases/WebSocketHandler.md) \| `undefined`

---

### handleConnection()

> **handleConnection**(`socket`, `path`, `user?`): `Promise`\<[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)\>

Defined in: [server/websocket/WebSocketHandler.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L72)

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

Defined in: [server/websocket/WebSocketHandler.ts:117](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L117)

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

Defined in: [server/websocket/WebSocketHandler.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L164)

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

Defined in: [server/websocket/WebSocketHandler.ts:201](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L201)

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

Defined in: [server/websocket/WebSocketHandler.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L228)

Get connection by ID

#### Parameters

##### connectionId

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md) \| `undefined`

---

### getAllConnections()

> **getAllConnections**(): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Defined in: [server/websocket/WebSocketHandler.ts:235](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L235)

Get all connections

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### getConnectionsByUser()

> **getConnectionsByUser**(`userId`): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Defined in: [server/websocket/WebSocketHandler.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L242)

Get connections for a user

#### Parameters

##### userId

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### getConnectionsByPath()

> **getConnectionsByPath**(`path`): [`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

Defined in: [server/websocket/WebSocketHandler.ts:251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L251)

Get connections for a path

#### Parameters

##### path

`string`

#### Returns

[`WebSocketConnection`](../type-aliases/WebSocketConnection.md)[]

---

### send()

> **send**(`connectionId`, `data`): `void`

Defined in: [server/websocket/WebSocketHandler.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L260)

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

Defined in: [server/websocket/WebSocketHandler.ts:284](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L284)

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

Defined in: [server/websocket/WebSocketHandler.ts:306](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L306)

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

Defined in: [server/websocket/WebSocketHandler.ts:334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L334)

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

Defined in: [server/websocket/WebSocketHandler.ts:344](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/websocket/WebSocketHandler.ts#L344)

Get connection count

#### Returns

`number`
