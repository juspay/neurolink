[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryToolCallRecord

# Type Alias: MemoryToolCallRecord

> **MemoryToolCallRecord** = `object`

One tool call as handed to conversation-memory storage after a loop step.
The stores read `args` (Redis also `arguments` / `parameters`), so the
field is named for what they read — an `input` key here is silently
persisted as `{}`, which is exactly the bug this type exists to prevent.

## Properties

### toolCallId?

> `optional` **toolCallId?**: `string`

---

### toolName?

> `optional` **toolName?**: `string`

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

---

### stepIndex?

> `optional` **stepIndex?**: `number`

Zero-based loop step, persisted as `metadata.stepIndex` by stores that keep it.

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Gemini 3 thought signature riding on the step's first call.

---

### timestamp?

> `optional` **timestamp?**: `Date`
