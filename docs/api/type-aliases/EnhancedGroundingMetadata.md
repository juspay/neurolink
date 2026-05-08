[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedGroundingMetadata

# Type Alias: EnhancedGroundingMetadata

> **EnhancedGroundingMetadata** = `object`

Defined in: [types/grounding.ts:130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L130)

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

Defined in: [types/grounding.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L132)

The original user query that triggered the grounded response

---

### webSearchQueries?

> `optional` **webSearchQueries?**: `string`[]

Defined in: [types/grounding.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L134)

Array of search queries used to find grounding sources

---

### searchResults

> **searchResults**: [`EnhancedSearchResult`](EnhancedSearchResult.md)[]

Defined in: [types/grounding.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L136)

Array of search results returned from web search

---

### segmentAttributions?

> `optional` **segmentAttributions?**: [`SegmentAttribution`](SegmentAttribution.md)[]

Defined in: [types/grounding.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L138)

Fine-grained attributions mapping response segments to sources

---

### sources

> **sources**: [`EnhancedGroundingSource`](EnhancedGroundingSource.md)[]

Defined in: [types/grounding.ts:140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L140)

Array of all sources used to ground the response

---

### averageConfidence?

> `optional` **averageConfidence?**: `number`

Defined in: [types/grounding.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L142)

Average confidence score across all grounding attributions (0-1)

---

### grounded

> **grounded**: `boolean`

Defined in: [types/grounding.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L144)

Whether the response is successfully grounded in sources
