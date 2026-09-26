[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeContextConfig

# Type Alias: KnowledgeContextConfig

> **KnowledgeContextConfig** = `object`

Ephemeral-context assembly limits.

## Properties

### maxTokens?

> `optional` **maxTokens?**: `number`

Hard token budget for the assembled grounding block. Default: 4000.

---

### includeCitations?

> `optional` **includeCitations?**: `boolean`

Emit `[KB:<id>@<version>]` citations. Default: true.
