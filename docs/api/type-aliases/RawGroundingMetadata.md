[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawGroundingMetadata

# Type Alias: RawGroundingMetadata

> **RawGroundingMetadata** = `object`

Defined in: [types/grounding.ts:227](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/grounding.ts#L227)

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

Defined in: [types/grounding.ts:229](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/grounding.ts#L229)

Array of search queries used by the provider for web grounding

---

### searchEntryPoint?

> `optional` **searchEntryPoint?**: `object`

Defined in: [types/grounding.ts:231](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/grounding.ts#L231)

Search entry point with rendered HTML content for display

#### renderedContent?

> `optional` **renderedContent?**: `string`

HTML content that can be rendered to show search results

---

### groundingChunks?

> `optional` **groundingChunks?**: [`GroundingChunk`](GroundingChunk.md)[]

Defined in: [types/grounding.ts:236](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/grounding.ts#L236)

Array of grounding chunks from the provider

---

### groundingSupports?

> `optional` **groundingSupports?**: [`GroundingSupport`](GroundingSupport.md)[]

Defined in: [types/grounding.ts:238](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/grounding.ts#L238)

Array of grounding support information linking segments to chunks
