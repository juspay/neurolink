[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractor

# Type Alias: MetadataExtractor

> **MetadataExtractor** = `object`

Metadata Extractor type - all extractors implement this

## Properties

### type

> `readonly` **type**: [`MetadataExtractorType`](MetadataExtractorType.md)

Extractor type identifier

## Methods

### extract()

> **extract**(`chunks`, `params?`): `Promise`\<[`ExtractionResult`](ExtractionResult.md)[]\>

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
