[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicGuardMessage

# Type Alias: AnthropicGuardMessage

> **AnthropicGuardMessage** = `object`

Structural view of one Anthropic-shaped message, as used by both the direct
Anthropic loop and the native Vertex+Claude path. Tool calls ride as
`tool_use` blocks on an assistant message; their answers ride as
`tool_result` blocks on the following user message.

## Properties

### role

> **role**: `"user"` \| `"assistant"` \| `"system"`

`system` is included because the installed `@anthropic-ai/sdk` widens
`MessageParam["role"]` to accept it; narrowing here would make the SDK's
own array unassignable at the call site.

---

### content

> **content**: `string` \| [`AnthropicGuardBlock`](AnthropicGuardBlock.md)[]
