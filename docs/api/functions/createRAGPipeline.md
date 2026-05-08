[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRAGPipeline

# Function: createRAGPipeline()

> **createRAGPipeline**(`options`): [`RAGPipeline`](../classes/RAGPipeline.md)

Defined in: [rag/pipeline/RAGPipeline.ts:550](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L550)

Create a simple RAG pipeline with sensible defaults

## Parameters

### options

Basic configuration options

#### provider?

`string`

#### embeddingModel?

`string`

#### generationModel?

`string`

#### enableHybrid?

`boolean`

#### enableGraph?

`boolean`

## Returns

[`RAGPipeline`](../classes/RAGPipeline.md)

Configured RAGPipeline instance
