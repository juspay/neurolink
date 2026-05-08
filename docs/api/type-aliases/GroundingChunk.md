[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GroundingChunk

# Type Alias: GroundingChunk

> **GroundingChunk** = `object`

Defined in: [types/grounding.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L161)

Represents a grounding chunk from raw provider responses.
This is the low-level representation of a grounding source chunk
as returned directly from AI providers like Google Vertex AI.

## Example

```ts
const chunk: GroundingChunk = {
  web: {
    uri: "https://example.com/article",
    title: "Relevant Article",
  },
  confidenceScore: 0.87,
};
```

## Properties

### web?

> `optional` **web?**: `object`

Defined in: [types/grounding.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L163)

Web source information for this grounding chunk

#### uri?

> `optional` **uri?**: `string`

The URI of the web source

#### title?

> `optional` **title?**: `string`

The title of the web source

---

### confidenceScore?

> `optional` **confidenceScore?**: `number`

Defined in: [types/grounding.ts:170](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L170)

Confidence score for this grounding chunk (0-1)
