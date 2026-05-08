[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / pipeAsyncIterableToDataStream

# Function: pipeAsyncIterableToDataStream()

> **pipeAsyncIterableToDataStream**(`iterable`, `response`, `options?`): `Promise`\<`void`\>

Defined in: [server/streaming/dataStream.ts:339](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/streaming/dataStream.ts#L339)

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
