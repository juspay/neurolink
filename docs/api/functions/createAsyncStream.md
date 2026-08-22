[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAsyncStream

# Function: createAsyncStream()

> **createAsyncStream**(`responsePromise`): `AsyncGenerator`\<[`ClientStreamEvent`](../type-aliases/ClientStreamEvent.md), `void`, `unknown`\>

Defined in: [client/streamingClient.ts:1016](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/streamingClient.ts#L1016)

Create an async iterable from streaming response

## Parameters

### responsePromise

`Promise`\<`Response`\>

## Returns

`AsyncGenerator`\<[`ClientStreamEvent`](../type-aliases/ClientStreamEvent.md), `void`, `unknown`\>

## Example

```typescript
const stream = createAsyncStream(fetch("/api/stream", { method: "POST" }));

for await (const event of stream) {
  console.log(event);
}
```
