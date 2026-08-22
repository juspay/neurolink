[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingParser

# Type Alias: StreamingParser

> **StreamingParser** = `object`

Defined in: [types/common.ts:597](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L597)

Base interface for streaming response parsers

## Methods

### parse()

> **parse**(`chunk`): [`SageMakerStreamChunk`](SageMakerStreamChunk.md)[]

Defined in: [types/common.ts:599](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L599)

Parse a chunk of streaming data

#### Parameters

##### chunk

`Uint8Array`

#### Returns

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)[]

---

### isComplete()

> **isComplete**(`chunk`): `boolean`

Defined in: [types/common.ts:602](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L602)

Check if a chunk indicates completion

#### Parameters

##### chunk

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)

#### Returns

`boolean`

---

### extractUsage()

> **extractUsage**(`finalChunk`): [`SageMakerUsage`](SageMakerUsage.md) \| `undefined`

Defined in: [types/common.ts:605](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L605)

Extract final usage information

#### Parameters

##### finalChunk

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)

#### Returns

[`SageMakerUsage`](SageMakerUsage.md) \| `undefined`

---

### getName()

> **getName**(): `string`

Defined in: [types/common.ts:608](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L608)

Get parser name for debugging

#### Returns

`string`

---

### reset()

> **reset**(): `void`

Defined in: [types/common.ts:611](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L611)

Reset parser state for new stream

#### Returns

`void`
