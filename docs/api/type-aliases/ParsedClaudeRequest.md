[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeRequest

# Type Alias: ParsedClaudeRequest

> **ParsedClaudeRequest** = `object`

Defined in: [types/proxy.ts:279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L279)

Parsed representation of a Claude request, ready for NeuroLink's
generate() / stream() pipeline.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L280)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/proxy.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L281)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L282)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L283)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/proxy.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L284)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string` \| `object`[]

Defined in: [types/proxy.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L285)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L286)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L289)

Flat prompt string derived from the last user message.

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L292)

Images extracted from content blocks (base64 data URIs or URLs).

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L298)

Full conversation history converted to NeuroLink's ChatMessage shape.
Includes all messages, not just the last one.

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L301)

Tools translated to AI SDK-compatible shape for provider fallback.

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L316)

Tool choice mapping from Claude format.

- "auto" -> let the model decide
- "required" -> force tool use (any tool)
- "none" -> no tool use

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L319)

When toolChoice came from `{type: "tool", name: "..."}`, the tool name.

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/proxy.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L322)

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

Defined in: [types/proxy.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L329)

Original request metadata (if any).

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L332)

Stop sequences from the original request.
