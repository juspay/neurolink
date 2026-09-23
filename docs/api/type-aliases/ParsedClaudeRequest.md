[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeRequest

# Type Alias: ParsedClaudeRequest

> **ParsedClaudeRequest** = `object`

Defined in: [types/proxy.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L305)

Parsed representation of a Claude request, ready for NeuroLink's
generate() / stream() pipeline.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L306)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/proxy.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L307)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L308)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L309)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/proxy.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L310)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string` \| `object`[]

Defined in: [types/proxy.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L311)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L312)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L315)

Flat prompt string derived from the last user message.

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L318)

Images extracted from content blocks (base64 data URIs or URLs).

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L324)

Full conversation history converted to NeuroLink's ChatMessage shape.
Includes all messages, not just the last one.

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L327)

Tools translated to AI SDK-compatible shape for provider fallback.

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L342)

Tool choice mapping from Claude format.

- "auto" -> let the model decide
- "required" -> force tool use (any tool)
- "none" -> no tool use

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L345)

When toolChoice came from `{type: "tool", name: "..."}`, the tool name.

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/proxy.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L348)

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

Defined in: [types/proxy.ts:355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L355)

Original request metadata (if any).

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L358)

Stop sequences from the original request.
