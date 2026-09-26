[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndexedKnowledgeDocument

# Type Alias: IndexedKnowledgeDocument

> **IndexedKnowledgeDocument** = `object`

The internal search document built from a normalized entry. `exactKeys` and
`fields` hold pre-tokenized normalized text. Internal to NeuroLink.

## Properties

### id

> **id**: `string`

---

### exactKeys

> **exactKeys**: `string`[]

Normalized whole-phrase keys for exact/alias resolution.

---

### fields

> **fields**: `object`

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
