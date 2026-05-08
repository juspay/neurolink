[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeRequest

# Type Alias: ParsedClaudeRequest

> **ParsedClaudeRequest** = `object`

Defined in: [types/proxy.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L255)

Parsed representation of a Claude request, ready for NeuroLink's
generate() / stream() pipeline.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L256)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/proxy.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L257)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L258)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L259)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/proxy.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L260)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string` \| `object`[]

Defined in: [types/proxy.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L261)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L262)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:265](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L265)

Flat prompt string derived from the last user message.

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L268)

Images extracted from content blocks (base64 data URIs or URLs).

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L274)

Full conversation history converted to NeuroLink's ChatMessage shape.
Includes all messages, not just the last one.

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:277](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L277)

Tools translated to AI SDK-compatible shape for provider fallback.

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L292)

Tool choice mapping from Claude format.

- "auto" -> let the model decide
- "required" -> force tool use (any tool)
- "none" -> no tool use

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L295)

When toolChoice came from `{type: "tool", name: "..."}`, the tool name.

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/proxy.ts:298](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L298)

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

Defined in: [types/proxy.ts:305](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L305)

Original request metadata (if any).

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L308)

Stop sequences from the original request.
