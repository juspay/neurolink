[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlockDescriptor

# Type Alias: SSEContentBlockDescriptor

> **SSEContentBlockDescriptor** = \{ `type`: `"text"`; `text`: `""`; \} \| \{ `type`: `"thinking"`; `thinking`: `""`; \} \| \{ `type`: `"tool_use"`; `id`: `string`; `name`: `string`; `input`: `""`; \}

Defined in: [types/proxy.ts:178](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L178)

Content block descriptor for content_block_start events.
