[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingParser

# Type Alias: StreamingParser

> **StreamingParser** = `object`

Defined in: [types/common.ts:567](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L567)

Base interface for streaming response parsers

## Methods

### parse()

> **parse**(`chunk`): [`SageMakerStreamChunk`](SageMakerStreamChunk.md)[]

Defined in: [types/common.ts:569](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L569)

Parse a chunk of streaming data

#### Parameters

##### chunk

`Uint8Array`

#### Returns

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)[]

---

### isComplete()

> **isComplete**(`chunk`): `boolean`

Defined in: [types/common.ts:572](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L572)

Check if a chunk indicates completion

#### Parameters

##### chunk

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)

#### Returns

`boolean`

---

### extractUsage()

> **extractUsage**(`finalChunk`): [`SageMakerUsage`](SageMakerUsage.md) \| `undefined`

Defined in: [types/common.ts:575](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L575)

Extract final usage information

#### Parameters

##### finalChunk

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)

#### Returns

[`SageMakerUsage`](SageMakerUsage.md) \| `undefined`

---

### getName()

> **getName**(): `string`

Defined in: [types/common.ts:578](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L578)

Get parser name for debugging

#### Returns

`string`

---

### reset()

> **reset**(): `void`

Defined in: [types/common.ts:581](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L581)

Reset parser state for new stream

#### Returns

`void`
