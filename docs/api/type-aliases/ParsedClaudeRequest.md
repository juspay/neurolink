[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeRequest

# Type Alias: ParsedClaudeRequest

> **ParsedClaudeRequest** = `object`

Defined in: [types/proxy.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L268)

Parsed representation of a Claude request, ready for NeuroLink's
generate() / stream() pipeline.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L269)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/proxy.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L270)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L271)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L272)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/proxy.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L273)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string` \| `object`[]

Defined in: [types/proxy.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L274)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L275)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L278)

Flat prompt string derived from the last user message.

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L281)

Images extracted from content blocks (base64 data URIs or URLs).

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L287)

Full conversation history converted to NeuroLink's ChatMessage shape.
Includes all messages, not just the last one.

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L290)

Tools translated to AI SDK-compatible shape for provider fallback.

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L305)

Tool choice mapping from Claude format.

- "auto" -> let the model decide
- "required" -> force tool use (any tool)
- "none" -> no tool use

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L308)

When toolChoice came from `{type: "tool", name: "..."}`, the tool name.

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/proxy.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L311)

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

Defined in: [types/proxy.ts:318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L318)

Original request metadata (if any).

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L321)

Stop sequences from the original request.
