[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GroundingSupport

# Type Alias: GroundingSupport

> **GroundingSupport** = `object`

Defined in: [types/grounding.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L190)

Represents grounding support information from raw provider responses.
Contains segment information and links to the grounding chunks that
support that segment, as returned directly from AI providers.

## Example

```ts
const support: GroundingSupport = {
  segment: {
    text: "The feature was released in 2024",
    startIndex: 0,
    endIndex: 32,
    partIndex: 0,
  },
  groundingChunkIndices: [0, 1],
  confidenceScores: [0.92, 0.85],
};
```

## Properties

### segment?

> `optional` **segment?**: `object`

Defined in: [types/grounding.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L192)

The text segment that is being grounded

#### text?

> `optional` **text?**: `string`

The text content of the segment

#### startIndex?

> `optional` **startIndex?**: `number`

Starting character index in the response

#### endIndex?

> `optional` **endIndex?**: `number`

Ending character index in the response

#### partIndex?

> `optional` **partIndex?**: `number`

Index of the response part this segment belongs to

---

### groundingChunkIndices?

> `optional` **groundingChunkIndices?**: `number`[]

Defined in: [types/grounding.ts:203](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L203)

Indices into the groundingChunks array that support this segment

---

### confidenceScores?

> `optional` **confidenceScores?**: `number`[]

Defined in: [types/grounding.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L205)

Confidence scores corresponding to each grounding chunk index
