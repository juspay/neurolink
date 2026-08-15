[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeContextConfig

# Type Alias: KnowledgeContextConfig

> **KnowledgeContextConfig** = `object`

Defined in: [types/knowledge.ts:200](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L200)

Ephemeral-context assembly limits.

## Properties

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/knowledge.ts:202](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L202)

Hard token budget for the assembled grounding block. Default: 4000.

---

### includeCitations?

> `optional` **includeCitations?**: `boolean`

Defined in: [types/knowledge.ts:204](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L204)

Emit `[KB:<id>@<version>]` citations. Default: true.
