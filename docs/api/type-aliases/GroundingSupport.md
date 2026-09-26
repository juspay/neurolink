[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GroundingSupport

# Type Alias: GroundingSupport

> **GroundingSupport** = `object`

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

Indices into the groundingChunks array that support this segment

---

### confidenceScores?

> `optional` **confidenceScores?**: `number`[]

Confidence scores corresponding to each grounding chunk index
