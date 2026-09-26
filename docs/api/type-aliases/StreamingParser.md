[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingParser

# Type Alias: StreamingParser

> **StreamingParser** = `object`

Base interface for streaming response parsers

## Methods

### parse()

> **parse**(`chunk`): [`SageMakerStreamChunk`](SageMakerStreamChunk.md)[]

Parse a chunk of streaming data

#### Parameters

##### chunk

`Uint8Array`

#### Returns

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)[]

---

### isComplete()

> **isComplete**(`chunk`): `boolean`

Check if a chunk indicates completion

#### Parameters

##### chunk

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)

#### Returns

`boolean`

---

### extractUsage()

> **extractUsage**(`finalChunk`): [`SageMakerUsage`](SageMakerUsage.md) \| `undefined`

Extract final usage information

#### Parameters

##### finalChunk

[`SageMakerStreamChunk`](SageMakerStreamChunk.md)

#### Returns

[`SageMakerUsage`](SageMakerUsage.md) \| `undefined`

---

### getName()

> **getName**(): `string`

Get parser name for debugging

#### Returns

`string`

---

### reset()

> **reset**(): `void`

Reset parser state for new stream

#### Returns

`void`
