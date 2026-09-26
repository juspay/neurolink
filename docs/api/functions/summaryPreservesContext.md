[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / summaryPreservesContext

# Function: summaryPreservesContext()

> **summaryPreservesContext**(`summary`, `replacedMessages`, `decide`, `options?`): `Promise`\<`boolean`\>

Gate a generated summary before it replaces the messages it covers.

Stage 3 accepts any non-empty string today, so a summarizer that returned
an apology, a refusal, or a truncated fragment silently destroys the
conversation it was meant to preserve — and the messages are gone by the
time anyone reads the summary.

Returns `true` when the summary may be used and `false` only on a confident
rejection. Anything else — no decision provider, a failed call, an
unanswered or uncertain verdict — returns `true`, because refusing a
summary means falling through to truncation, which loses strictly more.

## Parameters

### summary

`string`

### replacedMessages

[`ChatMessage`](../type-aliases/ChatMessage.md)[]

### decide

[`DecisionCallerFn`](../type-aliases/DecisionCallerFn.md)

### options?

#### timeoutMs?

`number`

#### minConfidence?

`number`

## Returns

`Promise`\<`boolean`\>
