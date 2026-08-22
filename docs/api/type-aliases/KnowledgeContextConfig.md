[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeContextConfig

# Type Alias: KnowledgeContextConfig

> **KnowledgeContextConfig** = `object`

Defined in: [types/knowledge.ts:200](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L200)

Ephemeral-context assembly limits.

## Properties

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/knowledge.ts:202](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L202)

Hard token budget for the assembled grounding block. Default: 4000.

---

### includeCitations?

> `optional` **includeCitations?**: `boolean`

Defined in: [types/knowledge.ts:204](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L204)

Emit `[KB:<id>@<version>]` citations. Default: true.
