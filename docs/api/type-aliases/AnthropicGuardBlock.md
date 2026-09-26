[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicGuardBlock

# Type Alias: AnthropicGuardBlock

> **AnthropicGuardBlock** = `object`

Structural view of one Anthropic content block, loose enough to accept the
official SDK's `ContentBlockParam` union and NeuroLink's own
`VertexAnthropicMessage` blocks without a cast at either call site.

## Properties

### type

> **type**: `string`

---

### content?

> `optional` **content?**: `unknown`

Payload of a `tool_result` block. Other block kinds carry other fields.

---

### text?

> `optional` **text?**: `string`

Text of a `text` block.
