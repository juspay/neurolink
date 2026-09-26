[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LLMMetadataExtractor

# Class: LLMMetadataExtractor

LLM-powered metadata extractor
Extracts title, summary, keywords, Q&A pairs, and custom schema data

## Constructors

### Constructor

> **new LLMMetadataExtractor**(`options?`): `LLMMetadataExtractor`

#### Parameters

##### options?

###### provider?

`string`

###### modelName?

`string`

#### Returns

`LLMMetadataExtractor`

## Methods

### extract()

> **extract**(`chunks`, `params`): `Promise`\<[`ExtractionResult`](../type-aliases/ExtractionResult.md)[]\>

Extract metadata from chunks based on configuration

#### Parameters

##### chunks

[`Chunk`](../type-aliases/Chunk.md)[]

Array of chunks to extract metadata from

##### params

[`ExtractParams`](../type-aliases/ExtractParams.md)

Extraction parameters

#### Returns

`Promise`\<[`ExtractionResult`](../type-aliases/ExtractionResult.md)[]\>

Array of extraction results, one per chunk
