[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedGroundingSource

# Type Alias: EnhancedGroundingSource

> **EnhancedGroundingSource** = `object`

Defined in: [types/grounding.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L27)

Represents a grounding source with enhanced metadata for search results.
Used when grounding responses with web search or retrieval results to
provide detailed information about each source that supports the AI response.

## Example

```ts
const source: EnhancedGroundingSource = {
  uri: "https://docs.example.com/api-reference",
  title: "API Reference Documentation",
  domain: "docs.example.com",
  confidenceScore: 0.95,
  isPrimary: true,
  chunkIndex: 0,
};
```

## Properties

### uri

> **uri**: `string`

Defined in: [types/grounding.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L29)

The full URI/URL of the source document

---

### title

> **title**: `string`

Defined in: [types/grounding.ts:31](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L31)

The title of the source document or web page

---

### domain

> **domain**: `string`

Defined in: [types/grounding.ts:33](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L33)

The domain name extracted from the URI (e.g., "example.com")

---

### confidenceScore?

> `optional` **confidenceScore?**: `number`

Defined in: [types/grounding.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L35)

Confidence score (0-1) indicating how well this source supports the response

---

### isPrimary?

> `optional` **isPrimary?**: `boolean`

Defined in: [types/grounding.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L37)

Whether this is a primary source for the grounded response

---

### chunkIndex?

> `optional` **chunkIndex?**: `number`

Defined in: [types/grounding.ts:39](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L39)

Index of the chunk within the source document that was used
