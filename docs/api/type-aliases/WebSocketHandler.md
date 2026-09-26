[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketHandler

# Type Alias: WebSocketHandler

> **WebSocketHandler** = `object`

WebSocket handler interface

## Properties

### onOpen?

> `optional` **onOpen?**: (`connection`) => `void` \| `Promise`\<`void`\>

#### Parameters

##### connection

[`WebSocketConnection`](WebSocketConnection.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onMessage?

> `optional` **onMessage?**: (`connection`, `message`) => `void` \| `Promise`\<`void`\>

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

#### Parameters

##### connection

[`WebSocketConnection`](WebSocketConnection.md)

##### error

`Error`

#### Returns

`void` \| `Promise`\<`void`\>
