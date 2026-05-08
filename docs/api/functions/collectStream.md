[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / collectStream

# Function: collectStream()

> **collectStream**(`stream`): `Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

Defined in: [client/streamingClient.ts:1081](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/streamingClient.ts#L1081)

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
