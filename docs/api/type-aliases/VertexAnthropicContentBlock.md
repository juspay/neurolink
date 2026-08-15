[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicContentBlock

# Type Alias: VertexAnthropicContentBlock

> **VertexAnthropicContentBlock** = \{ `type`: `"text"`; `text`: `string`; \} \| \{ `type`: `"tool_use"`; `id`: `string`; `name`: `string`; `input`: `Record`\<`string`, `unknown`\>; \} \| \{ `type`: `"tool_result"`; `tool_use_id`: `string`; `content`: `string`; \}

Defined in: [types/providers.ts:2474](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L2474)

Content block variants returned by the Anthropic Vertex SDK during streaming
and generation — used to narrow responses before handing tool calls back.
