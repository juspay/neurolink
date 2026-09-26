[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CrossEncoderReranker

# Class: CrossEncoderReranker

Cross-encoder style reranker interface
Placeholder for integration with cross-encoder models

## Constructors

### Constructor

> **new CrossEncoderReranker**(`modelName?`): `CrossEncoderReranker`

#### Parameters

##### modelName?

`string` = `"ms-marco-MiniLM-L-6-v2"`

#### Returns

`CrossEncoderReranker`

## Methods

### rerank()

> **rerank**(`_query`, `_documents`): `Promise`\<`object`[]\>

#### Parameters

##### \_query

`string`

##### \_documents

`string`[]

#### Returns

`Promise`\<`object`[]\>
