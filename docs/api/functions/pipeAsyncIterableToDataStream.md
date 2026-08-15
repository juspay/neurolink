[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / pipeAsyncIterableToDataStream

# Function: pipeAsyncIterableToDataStream()

> **pipeAsyncIterableToDataStream**(`iterable`, `response`, `options?`): `Promise`\<`void`\>

Defined in: [server/streaming/dataStream.ts:339](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/streaming/dataStream.ts#L339)

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
