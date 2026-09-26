[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingConfig

# Type Alias: KnowledgeGroundingConfig

> **KnowledgeGroundingConfig** = `object`

Constructor-level configuration for knowledge grounding. Sources are fixed
for the lifetime of a NeuroLink instance so the index can be built once.

## Properties

### enabled

> **enabled**: `boolean`

Master switch. Grounding runs only when true AND at least one source is loaded.

---

### sources

> **sources**: [`KnowledgeSource`](KnowledgeSource.md)[]

Knowledge sources used to build the instance's immutable in-memory index.
Required alongside `enabled`; pass an empty array only when intentionally
configuring no retrievable content.

---

### blockedDomains?

> `optional` **blockedDomains?**: `string`[]

Exclude these domains from retrieval. Empty/omitted means all domains are eligible.

---

### retrieval?

> `optional` **retrieval?**: [`KnowledgeRetrievalConfig`](KnowledgeRetrievalConfig.md)

---

### context?

> `optional` **context?**: [`KnowledgeContextConfig`](KnowledgeContextConfig.md)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Hard ceiling for one grounding operation before it fails open. Default: 800ms.
