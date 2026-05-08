[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LLMMetadataExtractor

# Class: LLMMetadataExtractor

Defined in: [rag/metadata/metadataExtractor.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/metadata/metadataExtractor.ts#L62)

LLM-powered metadata extractor
Extracts title, summary, keywords, Q&A pairs, and custom schema data

## Constructors

### Constructor

> **new LLMMetadataExtractor**(`options?`): `LLMMetadataExtractor`

Defined in: [rag/metadata/metadataExtractor.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/metadata/metadataExtractor.ts#L66)

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

Defined in: [rag/metadata/metadataExtractor.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/metadata/metadataExtractor.ts#L77)

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
