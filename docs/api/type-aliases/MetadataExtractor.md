[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractor

# Type Alias: MetadataExtractor

> **MetadataExtractor** = `object`

Defined in: [types/rag.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L102)

Metadata Extractor type - all extractors implement this

## Properties

### type

> `readonly` **type**: [`MetadataExtractorType`](MetadataExtractorType.md)

Defined in: [types/rag.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L104)

Extractor type identifier

## Methods

### extract()

> **extract**(`chunks`, `params?`): `Promise`\<[`ExtractionResult`](ExtractionResult.md)[]\>

Defined in: [types/rag.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L112)

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
