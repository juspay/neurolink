[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / pipeAsyncIterableToDataStream

# Function: pipeAsyncIterableToDataStream()

> **pipeAsyncIterableToDataStream**(`iterable`, `response`, `options?`): `Promise`\<`void`\>

Defined in: [server/streaming/dataStream.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/server/streaming/dataStream.ts#L339)

Pipe an async iterable to a data stream response

## Parameters

### iterable

`AsyncIterable`\<`unknown`\>

### response

`DataStreamResponse`

### options?

#### textId?

`string`

#### onChunk?

(`chunk`) => `void`

#### onError?

(`error`) => `void`

## Returns

`Promise`\<`void`\>
