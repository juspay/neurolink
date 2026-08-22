[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlockDescriptor

# Type Alias: SSEContentBlockDescriptor

> **SSEContentBlockDescriptor** = \{ `type`: `"text"`; `text`: `""`; \} \| \{ `type`: `"thinking"`; `thinking`: `""`; \} \| \{ `type`: `"tool_use"`; `id`: `string`; `name`: `string`; `input`: `""`; \}

Defined in: [types/proxy.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L178)

Content block descriptor for content_block_start events.
