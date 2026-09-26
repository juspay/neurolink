[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeLexicalIndex

# Class: KnowledgeLexicalIndex

Field-aware BM25 over the document set. Query text is scored per field and
the weighted per-field scores are summed. Satisfies the structural
`KnowledgeLexicalSearcher` type held by a snapshot.

## Constructors

### Constructor

> **new KnowledgeLexicalIndex**(`weights`): `KnowledgeLexicalIndex`

#### Parameters

##### weights

[`KnowledgeFieldWeights`](../type-aliases/KnowledgeFieldWeights.md)

#### Returns

`KnowledgeLexicalIndex`

## Methods

### add()

> **add**(`document`): `void`

#### Parameters

##### document

[`IndexedKnowledgeDocument`](../type-aliases/IndexedKnowledgeDocument.md)

#### Returns

`void`

---

### finalize()

> **finalize**(): `void`

#### Returns

`void`

---

### search()

> **search**(`queryTokens`, `topK`, `eligibleEntryIds?`): [`KnowledgeLexicalMatch`](../type-aliases/KnowledgeLexicalMatch.md)[]

#### Parameters

##### queryTokens

`string`[]

##### topK

`number`

##### eligibleEntryIds?

`ReadonlySet`\<`string`\>

#### Returns

[`KnowledgeLexicalMatch`](../type-aliases/KnowledgeLexicalMatch.md)[]
