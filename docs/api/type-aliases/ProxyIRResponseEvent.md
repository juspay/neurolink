[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRResponseEvent

# Type Alias: ProxyIRResponseEvent

> **ProxyIRResponseEvent** = \{ `kind`: `"text_delta"`; `text`: `string`; \} \| \{ `kind`: `"thinking_delta"`; `text`: `string`; \} \| \{ `kind`: `"tool_call_start"`; `callId`: `string`; `toolName`: `string`; \} \| \{ `kind`: `"tool_call_arguments_delta"`; `callId`: `string`; `partialArguments`: `string`; \} \| \{ `kind`: `"tool_call_done"`; `callId`: `string`; \} \| \{ `kind`: `"item_done"`; \} \| \{ `kind`: `"usage"`; `usage`: [`UsageContext`](UsageContext.md); \} \| \{ `kind`: `"terminal"`; `outcome`: [`ProxyIRTerminalOutcome`](ProxyIRTerminalOutcome.md); \}
