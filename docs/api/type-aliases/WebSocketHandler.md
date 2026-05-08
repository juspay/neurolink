[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketHandler

# Type Alias: WebSocketHandler

> **WebSocketHandler** = `object`

Defined in: [types/server.ts:966](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L966)

WebSocket handler interface

## Properties

### onOpen?

> `optional` **onOpen?**: (`connection`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:967](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L967)

#### Parameters

##### connection

[`WebSocketConnection`](WebSocketConnection.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onMessage?

> `optional` **onMessage?**: (`connection`, `message`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:968](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L968)

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

Defined in: [types/server.ts:972](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L972)

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

Defined in: [types/server.ts:977](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L977)

#### Parameters

##### connection

[`WebSocketConnection`](WebSocketConnection.md)

##### error

`Error`

#### Returns

`void` \| `Promise`\<`void`\>
