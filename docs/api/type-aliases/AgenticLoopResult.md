[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopResult

# Type Alias: AgenticLoopResult\<TConversation\>

> **AgenticLoopResult**\<`TConversation`\> = `object`

## Type Parameters

### TConversation

`TConversation`

## Properties

### text

> **text**: `string`

---

### toolCalls

> **toolCalls**: [`AgenticLoopToolCall`](AgenticLoopToolCall.md)[]

---

### toolExecutions

> **toolExecutions**: `object`[]

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

---

### finishReason

> **finishReason**: `string`

---

### rawStopReason

> **rawStopReason**: `string` \| `undefined`

---

### conversation

> **conversation**: `TConversation`

---

### aborted

> **aborted**: `boolean`

True when the turn ended because its abort signal fired rather than
because the model finished.

Not derivable from anything else on this result, which is why it is here.
A turn cut short mid-stream never receives a terminal event, so
`rawStopReason` is undefined and `mapFinishReason` lands on exactly the
value a model that answered and stopped produces. Without this flag a
caller reading the result cannot tell "the model finished" from "we
stopped listening", and every consumer that branches on the outcome —
fallback gates, retry policy, a UI that says why a turn ended — reads the
interrupted turn as a success.
