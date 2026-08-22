[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / extractMetadata

# Function: extractMetadata()

> **extractMetadata**(`chunks`, `params`, `options?`): `Promise`\<[`ExtractionResult`](../type-aliases/ExtractionResult.md)[]\>

Defined in: [rag/metadata/metadataExtractor.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/rag/metadata/metadataExtractor.ts#L384)

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
