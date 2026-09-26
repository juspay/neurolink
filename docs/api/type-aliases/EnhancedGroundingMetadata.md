[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedGroundingMetadata

# Type Alias: EnhancedGroundingMetadata

> **EnhancedGroundingMetadata** = `object`

Comprehensive grounding metadata containing all information about how
an AI response is grounded in external sources. This is the primary
type used to represent the complete grounding context for a response.

## Example

```ts
const metadata: EnhancedGroundingMetadata = {
  query: "What are the system requirements?",
  webSearchQueries: ["system requirements documentation"],
  searchResults: [
    { uri: "https://docs.example.com/requirements", title: "Requirements" },
  ],
  sources: [
    {
      uri: "https://docs.example.com/requirements",
      title: "Requirements",
      domain: "docs.example.com",
    },
  ],
  averageConfidence: 0.89,
  grounded: true,
};
```

## Properties

### query

> **query**: `string`

The original user query that triggered the grounded response

---

### webSearchQueries?

> `optional` **webSearchQueries?**: `string`[]

Array of search queries used to find grounding sources

---

### searchResults

> **searchResults**: [`EnhancedSearchResult`](EnhancedSearchResult.md)[]

Array of search results returned from web search

---

### segmentAttributions?

> `optional` **segmentAttributions?**: [`SegmentAttribution`](SegmentAttribution.md)[]

Fine-grained attributions mapping response segments to sources

---

### sources

> **sources**: [`EnhancedGroundingSource`](EnhancedGroundingSource.md)[]

Array of all sources used to ground the response

---

### averageConfidence?

> `optional` **averageConfidence?**: `number`

Average confidence score across all grounding attributions (0-1)

---

### grounded

> **grounded**: `boolean`

Whether the response is successfully grounded in sources
