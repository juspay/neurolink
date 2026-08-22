[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createStreamingClient

# Function: createStreamingClient()

> **createStreamingClient**(`config`): `object`

Defined in: [client/streamingClient.ts:815](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/streamingClient.ts#L815)

Streaming Client Factory

Creates streaming clients for real-time communication with NeuroLink API.

## Parameters

### config

[`StreamingClientConfig`](../type-aliases/StreamingClientConfig.md)

## Returns

`object`

### connect

> **connect**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

### disconnect

> **disconnect**: () => `void`

#### Returns

`void`

### stream

> **stream**: (`options`) => `Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

#### Parameters

##### options

[`StreamingRequestOptions`](../type-aliases/StreamingRequestOptions.md) & `object`

#### Returns

`Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

### send

> **send**: (`data`) => `void`

#### Parameters

##### data

`unknown`

#### Returns

`void`

### on

> **on**: (`event`, `callback`) => `void`

#### Parameters

##### event

`string`

##### callback

[`ClientWebSocketMessageHandler`](../type-aliases/ClientWebSocketMessageHandler.md)

#### Returns

`void`

### off

> **off**: (`event`, `callback`) => `void`

#### Parameters

##### event

`string`

##### callback

[`ClientWebSocketMessageHandler`](../type-aliases/ClientWebSocketMessageHandler.md)

#### Returns

`void`

### getState

> **getState**: () => [`ClientWebSocketState`](../type-aliases/ClientWebSocketState.md)

#### Returns

[`ClientWebSocketState`](../type-aliases/ClientWebSocketState.md)

## Examples

```typescript
const client = createStreamingClient({
  baseUrl: "https://api.example.com",
  apiKey: "your-key",
  transport: "sse",
});

const result = await client.stream({
  input: { text: "Hello" },
  callbacks: {
    onText: (text) => console.log(text),
  },
});
```

```typescript
const client = createStreamingClient({
  baseUrl: "https://api.example.com",
  apiKey: "your-key",
  transport: "websocket",
});

await client.connect();
const result = await client.stream({
  input: { text: "Hello" },
});
```
