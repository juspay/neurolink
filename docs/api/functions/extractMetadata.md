[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / extractMetadata

# Function: extractMetadata()

> **extractMetadata**(`chunks`, `params`, `options?`): `Promise`\<[`ExtractionResult`](../type-aliases/ExtractionResult.md)[]\>

Defined in: [rag/metadata/metadataExtractor.ts:384](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/metadata/metadataExtractor.ts#L384)

Convenience function to extract metadata from chunks

## Parameters

### chunks

[`Chunk`](../type-aliases/Chunk.md)[]

Chunks to process

### params

[`ExtractParams`](../type-aliases/ExtractParams.md)

Extraction parameters

### options?

Extractor options

#### provider?

`string`

#### modelName?

`string`

## Returns

`Promise`\<[`ExtractionResult`](../type-aliases/ExtractionResult.md)[]\>

Extraction results
