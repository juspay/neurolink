[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopStepResult

# Type Alias: AgenticLoopStepResult\<TRaw\>

> **AgenticLoopStepResult**\<`TRaw`\> = `object`

Defined in: [types/loopEngine.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L37)

## Type Parameters

### TRaw

`TRaw` = `unknown`

## Properties

### text

> **text**: `string`

Defined in: [types/loopEngine.ts:38](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L38)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/loopEngine.ts:39](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L39)

---

### toolCalls

> **toolCalls**: [`AgenticLoopToolCall`](AgenticLoopToolCall.md)[]

Defined in: [types/loopEngine.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L40)

---

### usage

> **usage**: [`AgenticLoopUsage`](AgenticLoopUsage.md)

Defined in: [types/loopEngine.ts:41](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L41)

---

### rawStopReason

> **rawStopReason**: `string` \| `undefined`

Defined in: [types/loopEngine.ts:43](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L43)

Provider's own raw stop/finish-reason string, e.g. "tool_use", "MAX_TOKENS"

---

### raw

> **raw**: `TRaw`

Defined in: [types/loopEngine.ts:46](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L46)

Adapter-private accumulated response data needed by buildToolResultMessages
(e.g. Anthropic's ordered content blocks, Gemini's rawResponseParts).
