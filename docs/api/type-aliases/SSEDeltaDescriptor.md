[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEDeltaDescriptor

# Type Alias: SSEDeltaDescriptor

> **SSEDeltaDescriptor** = \{ `type`: `"text_delta"`; `text`: `string`; \} \| \{ `type`: `"thinking_delta"`; `thinking`: `string`; \} \| \{ `type`: `"input_json_delta"`; `partial_json`: `string`; \}

Defined in: [types/proxy.ts:172](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L172)

Delta descriptor for content_block_delta events.
