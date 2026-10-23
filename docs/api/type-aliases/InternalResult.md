[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalResult

# Type Alias: InternalResult

> **InternalResult** = `object`

Minimal subset of NeuroLink's GenerateResult that the proxy layer consumes.
Kept intentionally narrow so the proxy layer does not depend on every
field of the full type.

## Properties

### content

> **content**: `string`

---

### model?

> `optional` **model?**: `string`

---

### finishReason?

> `optional` **finishReason?**: `string`

---

### reasoning?

> `optional` **reasoning?**: `string`

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

---

### toolCalls?

> `optional` **toolCalls?**: `object`[]

#### toolCallId

> **toolCallId**: `string`

#### toolName

> **toolName**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>
