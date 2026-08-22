[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MessageContent

# Type Alias: MessageContent

> **MessageContent** = `object`

Defined in: [types/multimodal.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L500)

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

Defined in: [types/multimodal.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L501)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/multimodal.ts:503](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L503)

Text content (`type: "text"`).

---

### image?

> `optional` **image?**: `string`

Defined in: [types/multimodal.ts:505](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L505)

Base64 / data-URI image (`type: "image"`).

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/multimodal.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L507)

MIME type for image/file parts.

---

### data?

> `optional` **data?**: `string` \| `Buffer`

Defined in: [types/multimodal.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L509)

Raw file bytes or base64 (`type: "file"`/document parts).

---

### name?

> `optional` **name?**: `string`

Defined in: [types/multimodal.ts:511](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L511)

File name for document/file parts.

---

### filename?

> `optional` **filename?**: `string`

Defined in: [types/multimodal.ts:513](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L513)

File name (alias used by some file parts).

---

### toolCallId?

> `optional` **toolCallId?**: `string`

Defined in: [types/multimodal.ts:515](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L515)

Tool-call identifier (`type: "tool-call"`/`"tool-result"`).

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/multimodal.ts:517](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L517)

Tool name (`type: "tool-call"`/`"tool-result"`).

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

Defined in: [types/multimodal.ts:519](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L519)

Tool-call arguments (`type: "tool-call"`).

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/multimodal.ts:521](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L521)

Tool-result payload (`type: "tool-result"`).

---

### isError?

> `optional` **isError?**: `boolean`

Defined in: [types/multimodal.ts:523](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L523)

Whether a tool-result represents an error (`type: "tool-result"`).

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `unknown`\>

Defined in: [types/multimodal.ts:529](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L529)

Provider-specific per-block options (e.g. Anthropic cache_control).
Read as `item.providerOptions` when converting `MessageContent[]` to
`ModelMessage[]` in `MessageBuilder.ts`.
