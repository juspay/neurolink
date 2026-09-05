[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeRequest

# Type Alias: ParsedClaudeRequest

> **ParsedClaudeRequest** = `object`

Defined in: [types/proxy.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L273)

Parsed representation of a Claude request, ready for NeuroLink's
generate() / stream() pipeline.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L274)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/proxy.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L275)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L276)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L277)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/proxy.ts:278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L278)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string` \| `object`[]

Defined in: [types/proxy.ts:279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L279)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L280)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L283)

Flat prompt string derived from the last user message.

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L286)

Images extracted from content blocks (base64 data URIs or URLs).

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L292)

Full conversation history converted to NeuroLink's ChatMessage shape.
Includes all messages, not just the last one.

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L295)

Tools translated to AI SDK-compatible shape for provider fallback.

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L310)

Tool choice mapping from Claude format.

- "auto" -> let the model decide
- "required" -> force tool use (any tool)
- "none" -> no tool use

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L313)

When toolChoice came from `{type: "tool", name: "..."}`, the tool name.

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/proxy.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L316)

Thinking configuration parsed from the request.

#### enabled

> **enabled**: `boolean`

#### budgetTokens?

> `optional` **budgetTokens?**: `number`

#### thinkingLevel?

> `optional` **thinkingLevel?**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

---

### metadata?

> `optional` **metadata?**: [`ClaudeMetadata`](ClaudeMetadata.md)

Defined in: [types/proxy.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L323)

Original request metadata (if any).

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L326)

Stop sequences from the original request.
