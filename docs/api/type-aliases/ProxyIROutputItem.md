[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIROutputItem

# Type Alias: ProxyIROutputItem

> **ProxyIROutputItem** = \{ `kind`: `"text"`; `text`: `string`; \} \| \{ `kind`: `"thinking"`; `text`: `string`; \} \| \{ `kind`: `"tool_call"`; `callId`: `string`; `toolName`: `string`; `argumentsRaw`: `string`; `argumentsJson?`: `Record`\<`string`, `unknown`\>; \}
