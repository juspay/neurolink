[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketStreamingClient

# Class: WebSocketStreamingClient

WebSocket Streaming Client

Provides WebSocket-based streaming with automatic reconnection,
heartbeat, and message handling.

## Example

```typescript
const ws = new WebSocketStreamingClient({
  url: "wss://api.example.com/ws",
  autoReconnect: true,
});

ws.on("message", (data) => console.log(data));

await ws.connect();
ws.send({ type: "chat", content: "Hello" });
```

## Constructors

### Constructor

> **new WebSocketStreamingClient**(`options`): `WebSocketStreamingClient`

#### Parameters

##### options

[`ClientWebSocketOptions`](../type-aliases/ClientWebSocketOptions.md)

#### Returns

`WebSocketStreamingClient`

## Methods

### connect()

> **connect**(): `Promise`\<`void`\>

Connect to WebSocket server

#### Returns

`Promise`\<`void`\>

---

### disconnect()

> **disconnect**(): `void`

Disconnect from WebSocket server

#### Returns

`void`

---

### send()

> **send**(`data`): `void`

Send message to server

#### Parameters

##### data

`unknown`

#### Returns

`void`

---

### request()

> **request**\<`T`\>(`data`, `timeout?`): `Promise`\<`T`\>

Send message and wait for response

#### Type Parameters

##### T

`T`

#### Parameters

##### data

`unknown`

##### timeout?

`number` = `30000`

#### Returns

`Promise`\<`T`\>

---

### on()

> **on**(`event`, `callback`): `void`

Register event handler

#### Parameters

##### event

`string`

##### callback

[`ClientWebSocketMessageHandler`](../type-aliases/ClientWebSocketMessageHandler.md)

#### Returns

`void`

---

### off()

> **off**(`event`, `callback`): `void`

Remove event handler

#### Parameters

##### event

`string`

##### callback

[`ClientWebSocketMessageHandler`](../type-aliases/ClientWebSocketMessageHandler.md)

#### Returns

`void`

---

### getState()

> **getState**(): [`ClientWebSocketState`](../type-aliases/ClientWebSocketState.md)

Get current connection state

#### Returns

[`ClientWebSocketState`](../type-aliases/ClientWebSocketState.md)

---

### messages()

> **messages**(): `AsyncGenerator`\<`unknown`, `void`, `unknown`\>

Create async iterator for messages

#### Returns

`AsyncGenerator`\<`unknown`, `void`, `unknown`\>
