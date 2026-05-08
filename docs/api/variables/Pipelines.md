[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Pipelines

# Variable: Pipelines

> `const` **Pipelines**: `object`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:216](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L216)

Quick pipeline builder factory

## Type Declaration

### create

> **create**: (`name?`) => [`PipelineBuilder`](../classes/PipelineBuilder.md)

Create a new pipeline builder

#### Parameters

##### name?

`string`

#### Returns

[`PipelineBuilder`](../classes/PipelineBuilder.md)

### safety

> **safety**: () => [`PipelineBuilder`](../classes/PipelineBuilder.md)

Create a safety-focused pipeline

#### Returns

[`PipelineBuilder`](../classes/PipelineBuilder.md)

### rag

> **rag**: () => [`PipelineBuilder`](../classes/PipelineBuilder.md)

Create a RAG evaluation pipeline

#### Returns

[`PipelineBuilder`](../classes/PipelineBuilder.md)

### quality

> **quality**: () => [`PipelineBuilder`](../classes/PipelineBuilder.md)

Create a quality-focused pipeline

#### Returns

[`PipelineBuilder`](../classes/PipelineBuilder.md)

### comprehensive

> **comprehensive**: () => [`PipelineBuilder`](../classes/PipelineBuilder.md)

Create a comprehensive pipeline with all scorers

#### Returns

[`PipelineBuilder`](../classes/PipelineBuilder.md)

### minimal

> **minimal**: () => [`PipelineBuilder`](../classes/PipelineBuilder.md)

Create a minimal fast pipeline

#### Returns

[`PipelineBuilder`](../classes/PipelineBuilder.md)

### summarization

> **summarization**: () => [`PipelineBuilder`](../classes/PipelineBuilder.md)

Create a summarization evaluation pipeline

#### Returns

[`PipelineBuilder`](../classes/PipelineBuilder.md)
