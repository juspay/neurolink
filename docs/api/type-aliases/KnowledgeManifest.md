[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeManifest

# Type Alias: KnowledgeManifest

> **KnowledgeManifest** = `object`

The versioned build artifact a host emits at build time. NeuroLink can
consume it directly (each catalog becomes a structured source) so hosts do
not need to construct `KnowledgeSource[]` by hand.

## Properties

### schemaVersion

> **schemaVersion**: `string`

---

### contentVersion

> **contentVersion**: `string`

---

### generatedAt

> **generatedAt**: `string`

---

### catalogs

> **catalogs**: [`KnowledgeManifestCatalog`](KnowledgeManifestCatalog.md)[]
