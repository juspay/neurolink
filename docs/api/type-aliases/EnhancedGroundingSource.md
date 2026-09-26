[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedGroundingSource

# Type Alias: EnhancedGroundingSource

> **EnhancedGroundingSource** = `object`

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

The full URI/URL of the source document

---

### title

> **title**: `string`

The title of the source document or web page

---

### domain

> **domain**: `string`

The domain name extracted from the URI (e.g., "example.com")

---

### confidenceScore?

> `optional` **confidenceScore?**: `number`

Confidence score (0-1) indicating how well this source supports the response

---

### isPrimary?

> `optional` **isPrimary?**: `boolean`

Whether this is a primary source for the grounded response

---

### chunkIndex?

> `optional` **chunkIndex?**: `number`

Index of the chunk within the source document that was used
