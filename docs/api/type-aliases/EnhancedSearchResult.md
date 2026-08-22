[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedSearchResult

# Type Alias: EnhancedSearchResult

> **EnhancedSearchResult** = `object`

Defined in: [types/grounding.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/grounding.ts#L102)

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

Defined in: [types/grounding.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/grounding.ts#L104)

The full URI/URL of the search result

---

### title

> **title**: `string`

Defined in: [types/grounding.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/grounding.ts#L106)

The title of the search result page

---

### snippet?

> `optional` **snippet?**: `string`

Defined in: [types/grounding.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/types/grounding.ts#L108)

Optional text snippet from the search result showing relevant content
