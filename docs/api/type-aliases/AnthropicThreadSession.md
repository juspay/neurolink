[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicThreadSession

# Type Alias: AnthropicThreadSession

> **AnthropicThreadSession** = `object`

The state of one Anthropic message thread across the steps of a turn.

The thread lives on the server for minutes and is best-effort, so this is a
cache of a conversation the caller still owns: whenever it is unsure, the
next plan is a `create` that resends everything.

## Properties

### enabled

> `readonly` **enabled**: `boolean`

False once the API has said it cannot thread this request.

## Methods

### carry()

> **carry**(`assistantText`): [`AnthropicThreadCarry`](AnthropicThreadCarry.md) \| `undefined`

What the next call of the same session needs to continue this thread, or
undefined when it cannot: the turn did not end on a normal stop, or no
response was stored. `assistantText` is the text the turn streamed, which
is what conversation memory will hand back as the assistant's reply.

#### Parameters

##### assistantText

`string`

#### Returns

[`AnthropicThreadCarry`](AnthropicThreadCarry.md) \| `undefined`

---

### plan()

> **plan**(`params`): [`AnthropicThreadPlan`](AnthropicThreadPlan.md)

#### Parameters

##### params

`MessageCreateParams` & [`AnthropicSamplingParams`](AnthropicSamplingParams.md)

#### Returns

[`AnthropicThreadPlan`](AnthropicThreadPlan.md)

---

### accept()

> **accept**(`messageId`, `stopReason?`): `void`

The response was complete and stored: the next step may continue from it.
`stopReason` says whether it also ended the turn.

#### Parameters

##### messageId

`string`

##### stopReason?

`string`

#### Returns

`void`

---

### reset()

> **reset**(): `void`

The next plan is a `create`.

#### Returns

`void`

---

### disable()

> **disable**(): `void`

Stop threading for the rest of the turn.

#### Returns

`void`
