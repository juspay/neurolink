[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicContentBlock

# Type Alias: VertexAnthropicContentBlock

> **VertexAnthropicContentBlock** = \{ `type`: `"text"`; `text`: `string`; \} \| \{ `type`: `"tool_use"`; `id`: `string`; `name`: `string`; `input`: `Record`\<`string`, `unknown`\>; \} \| \{ `type`: `"tool_result"`; `tool_use_id`: `string`; `content`: `string`; \}

Defined in: [types/providers.ts:2547](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2547)

Content block variants returned by the Anthropic Vertex SDK during streaming
and generation — used to narrow responses before handing tool calls back.
