[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CohereRelevanceScorer

# Class: CohereRelevanceScorer

Cohere-style relevance scorer interface
Placeholder for integration with Cohere's rerank API

## Constructors

### Constructor

> **new CohereRelevanceScorer**(`modelName?`): `CohereRelevanceScorer`

#### Parameters

##### modelName?

`string` = `"rerank-v3.5"`

#### Returns

`CohereRelevanceScorer`

## Methods

### score()

> **score**(`_query`, `_documents`): `Promise`\<`object`[]\>

#### Parameters

##### \_query

`string`

##### \_documents

`string`[]

#### Returns

`Promise`\<`object`[]\>
