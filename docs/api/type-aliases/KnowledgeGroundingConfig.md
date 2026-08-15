[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingConfig

# Type Alias: KnowledgeGroundingConfig

> **KnowledgeGroundingConfig** = `object`

Defined in: [types/knowledge.ts:211](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L211)

Constructor-level configuration for knowledge grounding. Sources are fixed
for the lifetime of a NeuroLink instance so the index can be built once.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/knowledge.ts:213](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L213)

Master switch. Grounding runs only when true AND at least one source is loaded.

---

### sources

> **sources**: [`KnowledgeSource`](KnowledgeSource.md)[]

Defined in: [types/knowledge.ts:219](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L219)

Knowledge sources used to build the instance's immutable in-memory index.
Required alongside `enabled`; pass an empty array only when intentionally
configuring no retrievable content.

---

### blockedDomains?

> `optional` **blockedDomains?**: `string`[]

Defined in: [types/knowledge.ts:221](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L221)

Exclude these domains from retrieval. Empty/omitted means all domains are eligible.

---

### retrieval?

> `optional` **retrieval?**: [`KnowledgeRetrievalConfig`](KnowledgeRetrievalConfig.md)

Defined in: [types/knowledge.ts:222](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L222)

---

### context?

> `optional` **context?**: [`KnowledgeContextConfig`](KnowledgeContextConfig.md)

Defined in: [types/knowledge.ts:223](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L223)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/knowledge.ts:225](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L225)

Hard ceiling for one grounding operation before it fails open. Default: 800ms.
