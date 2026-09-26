[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EphemeralContext

# Type Alias: EphemeralContext

> **EphemeralContext** = `object`

A block of context assembled for a single generation call without becoming
durable conversation. The NeuroLink call boundary injects its content into
the effective system prompt and never persists it as a user message.

## Properties

### content

> **content**: `string`

---

### kind

> **kind**: `"knowledge"`

---

### trusted

> **trusted**: `boolean`

Host-supplied reviewed content is trusted reference data.

---

### citations?

> `optional` **citations?**: [`KnowledgeCitation`](KnowledgeCitation.md)[]

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>
