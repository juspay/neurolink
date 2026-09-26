[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawGroundingMetadata

# Type Alias: RawGroundingMetadata

> **RawGroundingMetadata** = `object`

Raw grounding metadata as returned directly from AI providers.
This is the unprocessed format that gets transformed into
EnhancedGroundingMetadata for consistent consumption across the SDK.

## Example

```ts
const rawMetadata: RawGroundingMetadata = {
  webSearchQueries: ["neurolink documentation"],
  searchEntryPoint: {
    renderedContent: "<div>Search results widget HTML</div>",
  },
  groundingChunks: [
    { web: { uri: "https://docs.neurolink.dev", title: "NeuroLink Docs" } },
  ],
  groundingSupports: [
    { segment: { text: "NeuroLink is..." }, groundingChunkIndices: [0] },
  ],
};
```

## Properties

### webSearchQueries?

> `optional` **webSearchQueries?**: `string`[]

Array of search queries used by the provider for web grounding

---

### searchEntryPoint?

> `optional` **searchEntryPoint?**: `object`

Search entry point with rendered HTML content for display

#### renderedContent?

> `optional` **renderedContent?**: `string`

HTML content that can be rendered to show search results

---

### groundingChunks?

> `optional` **groundingChunks?**: [`GroundingChunk`](GroundingChunk.md)[]

Array of grounding chunks from the provider

---

### groundingSupports?

> `optional` **groundingSupports?**: [`GroundingSupport`](GroundingSupport.md)[]

Array of grounding support information linking segments to chunks
