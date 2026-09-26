[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GroundingChunk

# Type Alias: GroundingChunk

> **GroundingChunk** = `object`

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

Confidence score for this grounding chunk (0-1)
