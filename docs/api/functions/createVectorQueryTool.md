[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createVectorQueryTool

# Function: createVectorQueryTool()

> **createVectorQueryTool**(`config`, `vectorStore`): `object`

Defined in: [rag/retrieval/vectorQueryTool.ts:32](https://github.com/juspay/neurolink/blob/release/src/lib/rag/retrieval/vectorQueryTool.ts#L32)

Creates a vector query tool for semantic search
Follows NeuroLink's factory pattern

## Parameters

### config

[`VectorQueryToolConfig`](../type-aliases/VectorQueryToolConfig.md)

Tool configuration

### vectorStore

[`VectorStore`](../type-aliases/VectorStore.md) \| ((`context`) => [`VectorStore`](../type-aliases/VectorStore.md))

Vector store instance or resolver function

## Returns

Tool object with execute method

### name

> **name**: `string` = `id`

### description

> **description**: `string`

### parameters

> **parameters**: `ZodObject`\<\{ `query`: `ZodString`; `filter?`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodUnknown`\>\>; `topK`: `ZodOptional`\<`ZodNumber`\>; \}, `$strip`\>

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`VectorQueryResponse`](../type-aliases/VectorQueryResponse.md)\>

Execute the vector query

#### Parameters

##### params

Query parameters

###### query

`string`

###### filter?

[`MetadataFilter`](../type-aliases/MetadataFilter.md)

###### topK?

`number`

##### context?

`RequestContext`

Optional request context

#### Returns

`Promise`\<[`VectorQueryResponse`](../type-aliases/VectorQueryResponse.md)\>

Query results with relevant context
