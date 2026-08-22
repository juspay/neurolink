[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeLexicalIndex

# Class: KnowledgeLexicalIndex

Defined in: [knowledge/knowledgeIndex.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/knowledgeIndex.ts#L41)

Field-aware BM25 over the document set. Query text is scored per field and
the weighted per-field scores are summed. Satisfies the structural
`KnowledgeLexicalSearcher` type held by a snapshot.

## Constructors

### Constructor

> **new KnowledgeLexicalIndex**(`weights`): `KnowledgeLexicalIndex`

Defined in: [knowledge/knowledgeIndex.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/knowledgeIndex.ts#L59)

#### Parameters

##### weights

[`KnowledgeFieldWeights`](../type-aliases/KnowledgeFieldWeights.md)

#### Returns

`KnowledgeLexicalIndex`

## Methods

### add()

> **add**(`document`): `void`

Defined in: [knowledge/knowledgeIndex.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/knowledgeIndex.ts#L68)

#### Parameters

##### document

[`IndexedKnowledgeDocument`](../type-aliases/IndexedKnowledgeDocument.md)

#### Returns

`void`

---

### finalize()

> **finalize**(): `void`

Defined in: [knowledge/knowledgeIndex.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/knowledgeIndex.ts#L97)

#### Returns

`void`

---

### search()

> **search**(`queryTokens`, `topK`, `eligibleEntryIds?`): [`KnowledgeLexicalMatch`](../type-aliases/KnowledgeLexicalMatch.md)[]

Defined in: [knowledge/knowledgeIndex.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/knowledgeIndex.ts#L107)

#### Parameters

##### queryTokens

`string`[]

##### topK

`number`

##### eligibleEntryIds?

`ReadonlySet`\<`string`\>

#### Returns

[`KnowledgeLexicalMatch`](../type-aliases/KnowledgeLexicalMatch.md)[]
