[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EphemeralContext

# Type Alias: EphemeralContext

> **EphemeralContext** = `object`

Defined in: [types/knowledge.ts:367](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L367)

A block of context assembled for a single generation call without becoming
durable conversation. The NeuroLink call boundary injects its content into
the effective system prompt and never persists it as a user message.

## Properties

### content

> **content**: `string`

Defined in: [types/knowledge.ts:368](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L368)

---

### kind

> **kind**: `"knowledge"`

Defined in: [types/knowledge.ts:369](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L369)

---

### trusted

> **trusted**: `boolean`

Defined in: [types/knowledge.ts:371](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L371)

Host-supplied reviewed content is trusted reference data.

---

### citations?

> `optional` **citations?**: [`KnowledgeCitation`](KnowledgeCitation.md)[]

Defined in: [types/knowledge.ts:372](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L372)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/knowledge.ts:373](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L373)
