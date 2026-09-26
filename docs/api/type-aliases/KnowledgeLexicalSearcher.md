[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeLexicalSearcher

# Type Alias: KnowledgeLexicalSearcher

> **KnowledgeLexicalSearcher** = `object`

Structural contract of the field-aware lexical index held in a snapshot. A
concrete class in the knowledge runtime module satisfies this shape; typing
it structurally keeps this types file free of runtime imports.

## Properties

### search

> **search**: (`queryTokens`, `topK`, `eligibleEntryIds?`) => [`KnowledgeLexicalMatch`](KnowledgeLexicalMatch.md)[]

#### Parameters

##### queryTokens

`string`[]

##### topK

`number`

##### eligibleEntryIds?

`ReadonlySet`\<`string`\>

#### Returns

[`KnowledgeLexicalMatch`](KnowledgeLexicalMatch.md)[]
