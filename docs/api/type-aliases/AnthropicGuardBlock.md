[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicGuardBlock

# Type Alias: AnthropicGuardBlock

> **AnthropicGuardBlock** = `object`

Defined in: [types/context.ts:890](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L890)

Structural view of one Anthropic content block, loose enough to accept the
official SDK's `ContentBlockParam` union and NeuroLink's own
`VertexAnthropicMessage` blocks without a cast at either call site.

## Properties

### type

> **type**: `string`

Defined in: [types/context.ts:891](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L891)

---

### content?

> `optional` **content?**: `unknown`

Defined in: [types/context.ts:893](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L893)

Payload of a `tool_result` block. Other block kinds carry other fields.

---

### text?

> `optional` **text?**: `string`

Defined in: [types/context.ts:895](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L895)

Text of a `text` block.
