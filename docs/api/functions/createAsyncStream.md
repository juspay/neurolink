[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAsyncStream

# Function: createAsyncStream()

> **createAsyncStream**(`responsePromise`): `AsyncGenerator`\<[`ClientStreamEvent`](../type-aliases/ClientStreamEvent.md), `void`, `unknown`\>

Defined in: [client/streamingClient.ts:1016](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L1016)

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
