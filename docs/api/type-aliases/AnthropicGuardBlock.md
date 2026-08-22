[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicGuardBlock

# Type Alias: AnthropicGuardBlock

> **AnthropicGuardBlock** = `object`

Defined in: [types/context.ts:902](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L902)

Structural view of one Anthropic content block, loose enough to accept the
official SDK's `ContentBlockParam` union and NeuroLink's own
`VertexAnthropicMessage` blocks without a cast at either call site.

## Properties

### type

> **type**: `string`

Defined in: [types/context.ts:903](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L903)

---

### content?

> `optional` **content?**: `unknown`

Defined in: [types/context.ts:905](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L905)

Payload of a `tool_result` block. Other block kinds carry other fields.

---

### text?

> `optional` **text?**: `string`

Defined in: [types/context.ts:907](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L907)

Text of a `text` block.
