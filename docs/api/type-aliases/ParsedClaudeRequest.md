[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeRequest

# Type Alias: ParsedClaudeRequest

> **ParsedClaudeRequest** = `object`

Parsed representation of a Claude request, ready for NeuroLink's
generate() / stream() pipeline.

## Properties

### model

> **model**: `string`

---

### maxTokens

> **maxTokens**: `number`

---

### temperature?

> `optional` **temperature?**: `number`

---

### topP?

> `optional` **topP?**: `number`

---

### topK?

> `optional` **topK?**: `number`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string` \| `object`[]

---

### stream

> **stream**: `boolean`

---

### prompt

> **prompt**: `string`

Flat prompt string derived from the last user message.

---

### images

> **images**: `string`[]

Images extracted from content blocks (base64 data URIs or URLs).

---

### conversationMessages

> **conversationMessages**: `object`[]

Full conversation history converted to NeuroLink's ChatMessage shape.
Includes all messages, not just the last one.

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Tools translated to AI SDK-compatible shape for provider fallback.

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Tool choice mapping from Claude format.

- "auto" -> let the model decide
- "required" -> force tool use (any tool)
- "none" -> no tool use

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

When toolChoice came from `{type: "tool", name: "..."}`, the tool name.

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

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

Original request metadata (if any).

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Stop sequences from the original request.
