[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketStreamingClient

# Class: WebSocketStreamingClient

Defined in: [client/streamingClient.ts:463](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L463)

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

Defined in: [client/streamingClient.ts:472](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L472)

#### Parameters

##### options

[`ClientWebSocketOptions`](../type-aliases/ClientWebSocketOptions.md)

#### Returns

`WebSocketStreamingClient`

## Methods

### connect()

> **connect**(): `Promise`\<`void`\>

Defined in: [client/streamingClient.ts:485](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L485)

Connect to WebSocket server

#### Returns

`Promise`\<`void`\>

---

### disconnect()

> **disconnect**(): `void`

Defined in: [client/streamingClient.ts:567](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L567)

Disconnect from WebSocket server

#### Returns

`void`

---

### send()

> **send**(`data`): `void`

Defined in: [client/streamingClient.ts:580](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L580)

Send message to server

#### Parameters

##### data

`unknown`

#### Returns

`void`

---

### request()

> **request**\<`T`\>(`data`, `timeout?`): `Promise`\<`T`\>

Defined in: [client/streamingClient.ts:591](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L591)

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

Defined in: [client/streamingClient.ts:690](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L690)

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

Defined in: [client/streamingClient.ts:702](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L702)

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

Defined in: [client/streamingClient.ts:721](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L721)

Get current connection state

#### Returns

[`ClientWebSocketState`](../type-aliases/ClientWebSocketState.md)

---

### messages()

> **messages**(): `AsyncGenerator`\<`unknown`, `void`, `unknown`\>

Defined in: [client/streamingClient.ts:728](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L728)

Create async iterator for messages

#### Returns

`AsyncGenerator`\<`unknown`, `void`, `unknown`\>
