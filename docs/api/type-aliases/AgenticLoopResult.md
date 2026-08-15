[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopResult

# Type Alias: AgenticLoopResult\<TConversation\>

> **AgenticLoopResult**\<`TConversation`\> = `object`

Defined in: [types/loopEngine.ts:348](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L348)

## Type Parameters

### TConversation

`TConversation`

## Properties

### text

> **text**: `string`

Defined in: [types/loopEngine.ts:349](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L349)

---

### toolCalls

> **toolCalls**: [`AgenticLoopToolCall`](AgenticLoopToolCall.md)[]

Defined in: [types/loopEngine.ts:350](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L350)

---

### toolExecutions

> **toolExecutions**: `object`[]

Defined in: [types/loopEngine.ts:363](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L363)

Every tool dispatch the loop performed, in order, including the ones that
failed.

`id` and `error` are carried because providers persist tool activity as
paired call/result records keyed by the provider's own tool-call id, and
a result that failed is stored differently from one that succeeded. A
shape with only name/input/output cannot reconstruct either, so a
provider migrating its hand-rolled loop onto this engine would have to
silently drop both from its history — which is a behaviour change, not a
refactor.

#### id

> **id**: `string`

#### name

> **name**: `string`

#### input

> **input**: `Record`\<`string`, `unknown`\>

#### output

> **output**: `unknown`

#### error?

> `optional` **error?**: `string`

---

### usage

> **usage**: [`AgenticLoopUsage`](AgenticLoopUsage.md)

Defined in: [types/loopEngine.ts:370](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L370)

---

### finishReason

> **finishReason**: `string`

Defined in: [types/loopEngine.ts:371](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L371)

---

### rawStopReason

> **rawStopReason**: `string` \| `undefined`

Defined in: [types/loopEngine.ts:372](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L372)

---

### conversation

> **conversation**: `TConversation`

Defined in: [types/loopEngine.ts:373](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L373)
