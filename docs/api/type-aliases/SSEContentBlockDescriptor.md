[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlockDescriptor

# Type Alias: SSEContentBlockDescriptor

> **SSEContentBlockDescriptor** = \{ `type`: `"text"`; `text`: `""`; \} \| \{ `type`: `"thinking"`; `thinking`: `""`; \} \| \{ `type`: `"tool_use"`; `id`: `string`; `name`: `string`; `input`: `""`; \}

Defined in: [types/proxy.ts:166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L166)

Content block descriptor for content_block_start events.
