[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRTerminalOutcome

# Type Alias: ProxyIRTerminalOutcome

> **ProxyIRTerminalOutcome** = \{ `status`: `"completed"`; `finishReason`: `"end_turn"` \| `"tool_use"` \| `"max_tokens"` \| `"stop_sequence"`; \} \| \{ `status`: `"completed"`; `finishReason`: `"other"`; `rawFinishReason`: `string`; \} \| \{ `status`: `"failed"`; `error`: [`ProxyIRProviderError`](ProxyIRProviderError.md); \} \| \{ `status`: `"incomplete"`; `reason`: `string`; \}

How a response ended.

`finishReason: "other"` carries `rawFinishReason` because Anthropic's
`stop_reason` is typed `string | null` on the wire, deliberately open. A closed
union here would make any legitimate but unmodelled stop reason an
exhaustiveness throw at runtime, turning a successful upstream response into a
proxy failure.
