[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildDocument

# Function: buildDocument()

> **buildDocument**(`entry`): [`IndexedKnowledgeDocument`](../type-aliases/IndexedKnowledgeDocument.md)

Defined in: [knowledge/knowledgeIndex.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/knowledgeIndex.ts#L199)

Build the internal search document from a normalized entry. `exactKeys`
carry whole-phrase identifiers (entry id and title); each
text field is tokenized for the field-aware scorer.

## Parameters

### entry

[`NormalizedKnowledgeEntry`](../type-aliases/NormalizedKnowledgeEntry.md)

## Returns

[`IndexedKnowledgeDocument`](../type-aliases/IndexedKnowledgeDocument.md)
