[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEClient

# Class: SSEClient

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

Disconnect from SSE endpoint

#### Returns

`void`

---

### on()

> **on**(`event`, `callback`): `void`

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

Get current connection state

#### Returns

[`SSEConnectionState`](../type-aliases/SSEConnectionState.md)

---

### events()

> **events**(`requestOptions?`): `AsyncGenerator`\<[`ClientStreamEvent`](../type-aliases/ClientStreamEvent.md), `void`, `unknown`\>

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
