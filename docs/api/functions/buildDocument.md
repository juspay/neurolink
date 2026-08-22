[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildDocument

# Function: buildDocument()

> **buildDocument**(`entry`): [`IndexedKnowledgeDocument`](../type-aliases/IndexedKnowledgeDocument.md)

Defined in: [knowledge/knowledgeIndex.ts:199](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/knowledge/knowledgeIndex.ts#L199)

Build the internal search document from a normalized entry. `exactKeys`
carry whole-phrase identifiers (entry id and title); each
text field is tokenized for the field-aware scorer.

## Parameters

### entry

[`NormalizedKnowledgeEntry`](../type-aliases/NormalizedKnowledgeEntry.md)

## Returns

[`IndexedKnowledgeDocument`](../type-aliases/IndexedKnowledgeDocument.md)
