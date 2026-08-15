[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeManifest

# Type Alias: KnowledgeManifest

> **KnowledgeManifest** = `object`

Defined in: [types/knowledge.ts:146](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L146)

The versioned build artifact a host emits at build time. NeuroLink can
consume it directly (each catalog becomes a structured source) so hosts do
not need to construct `KnowledgeSource[]` by hand.

## Properties

### schemaVersion

> **schemaVersion**: `string`

Defined in: [types/knowledge.ts:147](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L147)

---

### contentVersion

> **contentVersion**: `string`

Defined in: [types/knowledge.ts:148](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L148)

---

### generatedAt

> **generatedAt**: `string`

Defined in: [types/knowledge.ts:149](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L149)

---

### catalogs

> **catalogs**: [`KnowledgeManifestCatalog`](KnowledgeManifestCatalog.md)[]

Defined in: [types/knowledge.ts:150](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L150)
