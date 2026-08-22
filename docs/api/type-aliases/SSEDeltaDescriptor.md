[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEDeltaDescriptor

# Type Alias: SSEDeltaDescriptor

> **SSEDeltaDescriptor** = \{ `type`: `"text_delta"`; `text`: `string`; \} \| \{ `type`: `"thinking_delta"`; `thinking`: `string`; \} \| \{ `type`: `"input_json_delta"`; `partial_json`: `string`; \}

Defined in: [types/proxy.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L184)

Delta descriptor for content_block_delta events.
