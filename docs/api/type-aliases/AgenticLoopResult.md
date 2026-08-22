[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopResult

# Type Alias: AgenticLoopResult\<TConversation\>

> **AgenticLoopResult**\<`TConversation`\> = `object`

Defined in: [types/loopEngine.ts:588](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L588)

## Type Parameters

### TConversation

`TConversation`

## Properties

### text

> **text**: `string`

Defined in: [types/loopEngine.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L589)

---

### toolCalls

> **toolCalls**: [`AgenticLoopToolCall`](AgenticLoopToolCall.md)[]

Defined in: [types/loopEngine.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L590)

---

### toolExecutions

> **toolExecutions**: `object`[]

Defined in: [types/loopEngine.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L603)

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

Defined in: [types/loopEngine.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L610)

---

### finishReason

> **finishReason**: `string`

Defined in: [types/loopEngine.ts:611](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L611)

---

### rawStopReason

> **rawStopReason**: `string` \| `undefined`

Defined in: [types/loopEngine.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L612)

---

### conversation

> **conversation**: `TConversation`

Defined in: [types/loopEngine.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L613)
