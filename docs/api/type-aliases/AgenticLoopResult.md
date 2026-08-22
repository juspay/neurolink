[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopResult

# Type Alias: AgenticLoopResult\<TConversation\>

> **AgenticLoopResult**\<`TConversation`\> = `object`

Defined in: [types/loopEngine.ts:574](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L574)

## Type Parameters

### TConversation

`TConversation`

## Properties

### text

> **text**: `string`

Defined in: [types/loopEngine.ts:575](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L575)

---

### toolCalls

> **toolCalls**: [`AgenticLoopToolCall`](AgenticLoopToolCall.md)[]

Defined in: [types/loopEngine.ts:576](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L576)

---

### toolExecutions

> **toolExecutions**: `object`[]

Defined in: [types/loopEngine.ts:589](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L589)

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

Defined in: [types/loopEngine.ts:596](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L596)

---

### finishReason

> **finishReason**: `string`

Defined in: [types/loopEngine.ts:597](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L597)

---

### rawStopReason

> **rawStopReason**: `string` \| `undefined`

Defined in: [types/loopEngine.ts:598](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L598)

---

### conversation

> **conversation**: `TConversation`

Defined in: [types/loopEngine.ts:599](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L599)
