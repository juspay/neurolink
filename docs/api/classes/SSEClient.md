[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEClient

# Class: SSEClient

Defined in: [client/streamingClient.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L65)

Server-Sent Events (SSE) Client

Provides a robust SSE connection with automatic reconnection,
event parsing, and async iterator support.

## Examples

```typescript
const sse = new SSEClient("https://api.example.com/stream");

sse.on("message", (data) => console.log(data));
sse.on("error", (error) => console.error(error));

await sse.connect({ body: { prompt: "Hello" } });
```

```typescript
const sse = new SSEClient("https://api.example.com/stream");

for await (const event of sse.events({ body: { prompt: "Hello" } })) {
  if (event.type === "text") {
    console.log(event.content);
  }
}
```

## Constructors

### Constructor

> **new SSEClient**(`url`, `options?`): `SSEClient`

Defined in: [client/streamingClient.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L74)

#### Parameters

##### url

`string`

##### options?

[`SSEConnectionOptions`](../type-aliases/SSEConnectionOptions.md) = `{}`

#### Returns

`SSEClient`

## Methods

### connect()

> **connect**(`requestOptions?`): `Promise`\<`void`\>

Defined in: [client/streamingClient.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L87)

Connect to SSE endpoint

#### Parameters

##### requestOptions?

###### body?

`unknown`

###### headers?

`Record`\<`string`, `string`\>

#### Returns

`Promise`\<`void`\>

---

### disconnect()

> **disconnect**(): `void`

Defined in: [client/streamingClient.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L179)

Disconnect from SSE endpoint

#### Returns

`void`

---

### on()

> **on**(`event`, `callback`): `void`

Defined in: [client/streamingClient.ts:326](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L326)

Register event handler

#### Parameters

##### event

`string`

##### callback

(...`args`) => `void`

#### Returns

`void`

---

### off()

> **off**(`event`, `callback`): `void`

Defined in: [client/streamingClient.ts:338](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L338)

Remove event handler

#### Parameters

##### event

`string`

##### callback

(...`args`) => `void`

#### Returns

`void`

---

### getState()

> **getState**(): [`SSEConnectionState`](../type-aliases/SSEConnectionState.md)

Defined in: [client/streamingClient.ts:355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L355)

Get current connection state

#### Returns

[`SSEConnectionState`](../type-aliases/SSEConnectionState.md)

---

### events()

> **events**(`requestOptions?`): `AsyncGenerator`\<[`ClientStreamEvent`](../type-aliases/ClientStreamEvent.md), `void`, `unknown`\>

Defined in: [client/streamingClient.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L369)

Create async iterator for events

#### Parameters

##### requestOptions?

###### body?

`unknown`

###### headers?

`Record`\<`string`, `string`\>

#### Returns

`AsyncGenerator`\<[`ClientStreamEvent`](../type-aliases/ClientStreamEvent.md), `void`, `unknown`\>

#### Example

```typescript
for await (const event of sse.events({ body: { prompt: "Hello" } })) {
  console.log(event);
}
```
