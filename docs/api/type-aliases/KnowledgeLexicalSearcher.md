[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeLexicalSearcher

# Type Alias: KnowledgeLexicalSearcher

> **KnowledgeLexicalSearcher** = `object`

Defined in: [types/knowledge.ts:305](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L305)

Structural contract of the field-aware lexical index held in a snapshot. A
concrete class in the knowledge runtime module satisfies this shape; typing
it structurally keeps this types file free of runtime imports.

## Properties

### search

> **search**: (`queryTokens`, `topK`, `eligibleEntryIds?`) => [`KnowledgeLexicalMatch`](KnowledgeLexicalMatch.md)[]

Defined in: [types/knowledge.ts:306](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L306)

#### Parameters

##### queryTokens

`string`[]

##### topK

`number`

##### eligibleEntryIds?

`ReadonlySet`\<`string`\>

#### Returns

[`KnowledgeLexicalMatch`](KnowledgeLexicalMatch.md)[]
