[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicGuardMessage

# Type Alias: AnthropicGuardMessage

> **AnthropicGuardMessage** = `object`

Defined in: [types/context.ts:925](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L925)

Structural view of one Anthropic-shaped message, as used by both the direct
Anthropic loop and the native Vertex+Claude path. Tool calls ride as
`tool_use` blocks on an assistant message; their answers ride as
`tool_result` blocks on the following user message.

## Properties

### role

> **role**: `"user"` \| `"assistant"` \| `"system"`

Defined in: [types/context.ts:931](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L931)

`system` is included because the installed `@anthropic-ai/sdk` widens
`MessageParam["role"]` to accept it; narrowing here would make the SDK's
own array unassignable at the call site.

---

### content

> **content**: `string` \| [`AnthropicGuardBlock`](AnthropicGuardBlock.md)[]

Defined in: [types/context.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L932)
