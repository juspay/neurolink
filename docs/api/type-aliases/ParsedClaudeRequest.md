[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeRequest

# Type Alias: ParsedClaudeRequest

> **ParsedClaudeRequest** = `object`

Defined in: [types/proxy.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L285)

Parsed representation of a Claude request, ready for NeuroLink's
generate() / stream() pipeline.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L286)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/proxy.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L287)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L288)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L289)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/proxy.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L290)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string` \| `object`[]

Defined in: [types/proxy.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L291)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L292)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L295)

Flat prompt string derived from the last user message.

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L298)

Images extracted from content blocks (base64 data URIs or URLs).

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L304)

Full conversation history converted to NeuroLink's ChatMessage shape.
Includes all messages, not just the last one.

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L307)

Tools translated to AI SDK-compatible shape for provider fallback.

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L322)

Tool choice mapping from Claude format.

- "auto" -> let the model decide
- "required" -> force tool use (any tool)
- "none" -> no tool use

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L325)

When toolChoice came from `{type: "tool", name: "..."}`, the tool name.

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/proxy.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L328)

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

Defined in: [types/proxy.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L335)

Original request metadata (if any).

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L338)

Stop sequences from the original request.
