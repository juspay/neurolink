[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / collectStream

# Function: collectStream()

> **collectStream**(`stream`): `Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

Defined in: [client/streamingClient.ts:1081](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/streamingClient.ts#L1081)

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
