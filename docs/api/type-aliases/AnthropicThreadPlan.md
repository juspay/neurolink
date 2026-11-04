[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicThreadPlan

# Type Alias: AnthropicThreadPlan

> **AnthropicThreadPlan** = `object`

One step's request, shaped for a thread.

## Properties

### mode

> **mode**: `"create"` \| `"continue"`

`continue` sends only the new messages and leaves out `system` and `tools`.

---

### params

> **params**: `Anthropic.Messages.MessageCreateParams` & [`AnthropicSamplingParams`](AnthropicSamplingParams.md) & `object`

#### Type Declaration

##### thread

> **thread**: [`AnthropicThreadRef`](AnthropicThreadRef.md)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

The `anthropic-beta` value for this request: the client's own plus the thread beta.
