[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRToolCallPart

# Type Alias: ProxyIRToolCallPart

> **ProxyIRToolCallPart** = `object`

A model-emitted call to a tool.

`argumentsRaw` is authoritative and always present; `argumentsJson` is a
convenience for the common case where the raw text parses. Keeping the raw text
means a call whose arguments are streamed in fragments, or are not valid JSON,
survives translation instead of being normalised into something the next hop
never sent.

## Properties

### kind

> **kind**: `"tool_call"`

---

### callId

> **callId**: `string`

---

### toolName

> **toolName**: `string`

---

### argumentsRaw

> **argumentsRaw**: `string`

---

### argumentsJson?

> `optional` **argumentsJson?**: `Record`\<`string`, `unknown`\>
