[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopStepResult

# Type Alias: AgenticLoopStepResult\<TRaw\>

> **AgenticLoopStepResult**\<`TRaw`\> = `object`

Defined in: [types/loopEngine.ts:52](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L52)

## Type Parameters

### TRaw

`TRaw` = `unknown`

## Properties

### text

> **text**: `string`

Defined in: [types/loopEngine.ts:53](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L53)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/loopEngine.ts:54](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L54)

---

### toolCalls

> **toolCalls**: [`AgenticLoopToolCall`](AgenticLoopToolCall.md)[]

Defined in: [types/loopEngine.ts:55](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L55)

---

### usage

> **usage**: [`AgenticLoopUsage`](AgenticLoopUsage.md)

Defined in: [types/loopEngine.ts:56](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L56)

---

### rawStopReason

> **rawStopReason**: `string` \| `undefined`

Defined in: [types/loopEngine.ts:58](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L58)

Provider's own raw stop/finish-reason string, e.g. "tool_use", "MAX_TOKENS"

---

### raw

> **raw**: `TRaw`

Defined in: [types/loopEngine.ts:61](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L61)

Adapter-private accumulated response data needed by buildToolResultMessages
(e.g. Anthropic's ordered content blocks, Gemini's rawResponseParts).
