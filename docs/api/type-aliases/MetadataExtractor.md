[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractor

# Type Alias: MetadataExtractor

> **MetadataExtractor** = `object`

Defined in: [types/rag.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L100)

Metadata Extractor type - all extractors implement this

## Properties

### type

> `readonly` **type**: [`MetadataExtractorType`](MetadataExtractorType.md)

Defined in: [types/rag.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L102)

Extractor type identifier

## Methods

### extract()

> **extract**(`chunks`, `params?`): `Promise`\<[`ExtractionResult`](ExtractionResult.md)[]\>

Defined in: [types/rag.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L110)

Extract metadata from chunks

#### Parameters

##### chunks

[`Chunk`](Chunk.md)[]

Array of chunks to extract metadata from

##### params?

[`ExtractParams`](ExtractParams.md)

Extraction parameters

#### Returns

`Promise`\<[`ExtractionResult`](ExtractionResult.md)[]\>

Array of extraction results
