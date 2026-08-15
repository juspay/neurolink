[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndexedKnowledgeDocument

# Type Alias: IndexedKnowledgeDocument

> **IndexedKnowledgeDocument** = `object`

Defined in: [types/knowledge.ts:279](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L279)

The internal search document built from a normalized entry. `exactKeys` and
`fields` hold pre-tokenized normalized text. Internal to NeuroLink.

## Properties

### id

> **id**: `string`

Defined in: [types/knowledge.ts:280](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L280)

---

### exactKeys

> **exactKeys**: `string`[]

Defined in: [types/knowledge.ts:282](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L282)

Normalized whole-phrase keys for exact/alias resolution.

---

### fields

> **fields**: `object`

Defined in: [types/knowledge.ts:284](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L284)

Per-field normalized token arrays fed to the field-aware BM25 scorer.

#### title

> **title**: `string`[]

#### aliases

> **aliases**: `string`[]

#### keywords

> **keywords**: `string`[]

#### summary

> **summary**: `string`[]

#### body

> **body**: `string`[]
