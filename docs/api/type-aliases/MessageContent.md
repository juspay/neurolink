[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MessageContent

# Type Alias: MessageContent

> **MessageContent** = `object`

Content format for multimodal messages (used internally).

#325: the loose `[key: string]: unknown` index signature has been replaced
with the concrete fields the codebase actually reads/writes across the
text / image / file / tool-call / tool-result shapes. This keeps the broad
structural compatibility the internal pipeline relies on (a single object
type, not a strict discriminated union that would force narrowing at every
consumer) while removing the "any key is allowed" hole that let typos and
unrelated keys through unchecked.

## Properties

### type

> **type**: `string`

---

### text?

> `optional` **text?**: `string`

Text content (`type: "text"`).

---

### image?

> `optional` **image?**: `string`

Base64 / data-URI image (`type: "image"`).

---

### mimeType?

> `optional` **mimeType?**: `string`

MIME type for image/file parts.

---

### data?

> `optional` **data?**: `string` \| `Buffer`

Raw file bytes or base64 (`type: "file"`/document parts).

---

### name?

> `optional` **name?**: `string`

File name for document/file parts.

---

### filename?

> `optional` **filename?**: `string`

File name (alias used by some file parts).

---

### toolCallId?

> `optional` **toolCallId?**: `string`

Tool-call identifier (`type: "tool-call"`/`"tool-result"`).

---

### toolName?

> `optional` **toolName?**: `string`

Tool name (`type: "tool-call"`/`"tool-result"`).

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

Tool-call arguments (`type: "tool-call"`).

---

### result?

> `optional` **result?**: `unknown`

Tool-result payload (`type: "tool-result"`).

---

### isError?

> `optional` **isError?**: `boolean`

Whether a tool-result represents an error (`type: "tool-result"`).

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `unknown`\>

Provider-specific per-block options (e.g. Anthropic cache_control).
Read as `item.providerOptions` when converting `MessageContent[]` to
`ModelMessage[]` in `MessageBuilder.ts`.
