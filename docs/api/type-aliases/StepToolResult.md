[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepToolResult

# Type Alias: StepToolResult

> **StepToolResult** = `object`

Shape of a completed tool result as returned by the AI SDK in
`onStepFinish`. Both `output` (AI SDK v4) and `result` (older shape)
are supported so the helper works across SDK versions.

## Properties

### toolName

> **toolName**: `string`

---

### output?

> `optional` **output?**: `unknown`

---

### result?

> `optional` **result?**: `unknown`

---

### error?

> `optional` **error?**: `string`
