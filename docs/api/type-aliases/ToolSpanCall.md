[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolSpanCall

# Type Alias: ToolSpanCall

> **ToolSpanCall** = `object`

One model-requested tool call, as recorded on the tool's observability span.

## Properties

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

Arguments the model passed to the tool.

---

### toolCallId?

> `optional` **toolCallId?**: `string`

The model's id for this call, shared with the tool_use block that requested it.
