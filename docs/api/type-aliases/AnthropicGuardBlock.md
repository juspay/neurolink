[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicGuardBlock

# Type Alias: AnthropicGuardBlock

> **AnthropicGuardBlock** = `object`

Defined in: [types/context.ts:911](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L911)

Structural view of one Anthropic content block, loose enough to accept the
official SDK's `ContentBlockParam` union and NeuroLink's own
`VertexAnthropicMessage` blocks without a cast at either call site.

## Properties

### type

> **type**: `string`

Defined in: [types/context.ts:912](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L912)

---

### content?

> `optional` **content?**: `unknown`

Defined in: [types/context.ts:914](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L914)

Payload of a `tool_result` block. Other block kinds carry other fields.

---

### text?

> `optional` **text?**: `string`

Defined in: [types/context.ts:916](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L916)

Text of a `text` block.
