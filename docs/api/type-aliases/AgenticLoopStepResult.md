[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopStepResult

# Type Alias: AgenticLoopStepResult\<TRaw\>

> **AgenticLoopStepResult**\<`TRaw`\> = `object`

## Type Parameters

### TRaw

`TRaw` = `unknown`

## Properties

### text

> **text**: `string`

---

### reasoning?

> `optional` **reasoning?**: `string`

---

### toolCalls

> **toolCalls**: [`AgenticLoopToolCall`](AgenticLoopToolCall.md)[]

---

### usage

> **usage**: [`AgenticLoopUsage`](AgenticLoopUsage.md)

---

### rawStopReason

> **rawStopReason**: `string` \| `undefined`

Provider's own raw stop/finish-reason string, e.g. "tool_use", "MAX_TOKENS"

---

### raw

> **raw**: `TRaw`

Adapter-private accumulated response data needed by buildToolResultMessages
(e.g. Anthropic's ordered content blocks, Gemini's rawResponseParts).
