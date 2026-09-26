[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedSearchResult

# Type Alias: EnhancedSearchResult

> **EnhancedSearchResult** = `object`

Represents a search result returned from web search grounding.
Contains the essential information from a web search result that
can be used to ground and verify AI responses.

## Example

```ts
const result: EnhancedSearchResult = {
  uri: "https://blog.example.com/best-practices",
  title: "Best Practices Guide",
  snippet: "This guide covers the essential best practices for...",
};
```

## Properties

### uri

> **uri**: `string`

The full URI/URL of the search result

---

### title

> **title**: `string`

The title of the search result page

---

### snippet?

> `optional` **snippet?**: `string`

Optional text snippet from the search result showing relevant content
