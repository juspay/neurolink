[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketHandler

# Type Alias: WebSocketHandler

> **WebSocketHandler** = `object`

Defined in: [types/server.ts:975](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L975)

WebSocket handler interface

## Properties

### onOpen?

> `optional` **onOpen?**: (`connection`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:976](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L976)

#### Parameters

##### connection

[`WebSocketConnection`](WebSocketConnection.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onMessage?

> `optional` **onMessage?**: (`connection`, `message`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:977](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L977)

#### Parameters

##### connection

[`WebSocketConnection`](WebSocketConnection.md)

##### message

[`WebSocketMessage`](WebSocketMessage.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onClose?

> `optional` **onClose?**: (`connection`, `code`, `reason`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:981](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L981)

#### Parameters

##### connection

[`WebSocketConnection`](WebSocketConnection.md)

##### code

`number`

##### reason

`string`

#### Returns

`void` \| `Promise`\<`void`\>

---

### onError?

> `optional` **onError?**: (`connection`, `error`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:986](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L986)

#### Parameters

##### connection

[`WebSocketConnection`](WebSocketConnection.md)

##### error

`Error`

#### Returns

`void` \| `Promise`\<`void`\>
