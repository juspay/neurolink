[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LLMMetadataExtractor

# Class: LLMMetadataExtractor

Defined in: [rag/metadata/metadataExtractor.ts:62](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/metadata/metadataExtractor.ts#L62)

LLM-powered metadata extractor
Extracts title, summary, keywords, Q&A pairs, and custom schema data

## Constructors

### Constructor

> **new LLMMetadataExtractor**(`options?`): `LLMMetadataExtractor`

Defined in: [rag/metadata/metadataExtractor.ts:66](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/metadata/metadataExtractor.ts#L66)

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

Defined in: [rag/metadata/metadataExtractor.ts:77](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/metadata/metadataExtractor.ts#L77)

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
