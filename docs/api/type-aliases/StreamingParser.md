[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingParser

# Type Alias: StreamingParser

> **StreamingParser** = `object`

Defined in: [types/common.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L685)

Base interface for streaming response parsers

## Methods

### parse()

> **parse**(`chunk`): [`SageMakerStreamChunk`](SageMakerStreamChunk.md)[]

Defined in: [types/common.ts:687](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L687)

Parse a chunk of streaming data

#### Parameters

##### chunk

`Uint8Array`

#### Returns

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)[]

---

### isComplete()

> **isComplete**(`chunk`): `boolean`

Defined in: [types/common.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L690)

Check if a chunk indicates completion

#### Parameters

##### chunk

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)

#### Returns

`boolean`

---

### extractUsage()

> **extractUsage**(`finalChunk`): [`SageMakerUsage`](SageMakerUsage.md) \| `undefined`

Defined in: [types/common.ts:693](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L693)

Extract final usage information

#### Parameters

##### finalChunk

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)

#### Returns

[`SageMakerUsage`](SageMakerUsage.md) \| `undefined`

---

### getName()

> **getName**(): `string`

Defined in: [types/common.ts:696](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L696)

Get parser name for debugging

#### Returns

`string`

---

### reset()

> **reset**(): `void`

Defined in: [types/common.ts:699](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L699)

Reset parser state for new stream

#### Returns

`void`
