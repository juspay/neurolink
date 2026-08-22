[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / collectStream

# Function: collectStream()

> **collectStream**(`stream`): `Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

Defined in: [client/streamingClient.ts:1081](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/streamingClient.ts#L1081)

Collect streaming events into a single result

## Parameters

### stream

`AsyncIterable`\<[`ClientStreamEvent`](../type-aliases/ClientStreamEvent.md)\>

## Returns

`Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

## Example

```typescript
const result = await collectStream(
  createAsyncStream(fetch("/api/stream", { method: "POST" })),
);
console.log(result.content);
```
