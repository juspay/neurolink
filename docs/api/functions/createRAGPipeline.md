[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRAGPipeline

# Function: createRAGPipeline()

> **createRAGPipeline**(`options`): [`RAGPipeline`](../classes/RAGPipeline.md)

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

#### multiModal?

[`MultiModalRAGConfig`](../type-aliases/MultiModalRAGConfig.md)

#### decide?

[`DecisionCallerFn`](../type-aliases/DecisionCallerFn.md)

Fail-open decision caller for per-query retrieval planning.

## Returns

[`RAGPipeline`](../classes/RAGPipeline.md)

Configured RAGPipeline instance
