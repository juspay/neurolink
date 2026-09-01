[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChatMessageMetadata

# Type Alias: ChatMessageMetadata

> **ChatMessageMetadata** = `object`

Defined in: [types/conversation.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L268)

Metadata associated with a ChatMessage.

## Properties

### isSummary?

> `optional` **isSummary?**: `boolean`

Defined in: [types/conversation.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L270)

Is this a summary message?

---

### summarizesFrom?

> `optional` **summarizesFrom?**: `string`

Defined in: [types/conversation.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L272)

First message ID that this summary covers

---

### summarizesTo?

> `optional` **summarizesTo?**: `string`

Defined in: [types/conversation.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L274)

Last message ID that this summary covers

---

### truncated?

> `optional` **truncated?**: `boolean`

Defined in: [types/conversation.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L276)

Was this message truncated due to token limits?

---

### source?

> `optional` **source?**: `string`

Defined in: [types/conversation.ts:278](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L278)

Source of the message (e.g., provider name, user input)

---

### language?

> `optional` **language?**: `string`

Defined in: [types/conversation.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L280)

Language of the message content

---

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types/conversation.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L282)

Confidence score for AI-generated content

---

### timestamp?

> `optional` **timestamp?**: `number`

Defined in: [types/conversation.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L289)

Numeric timestamp for internal tracking and efficient comparisons.
Format: Unix epoch milliseconds (number).
Complements the ISO string `ChatMessage.timestamp` field.
Use this for sorting, filtering, and performance-critical operations.

---

### modelUsed?

> `optional` **modelUsed?**: `string`

Defined in: [types/conversation.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L291)

Model used to generate this message

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Defined in: [types/conversation.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L293)

Unique signature identifying thought/reasoning patterns

---

### thoughtHash?

> `optional` **thoughtHash?**: `string`

Defined in: [types/conversation.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L295)

Hash of the thinking/reasoning content for deduplication

---

### thinkingExpanded?

> `optional` **thinkingExpanded?**: `boolean`

Defined in: [types/conversation.ts:297](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L297)

Whether extended thinking was used for this message

---

### stepIndex?

> `optional` **stepIndex?**: `number`

Defined in: [types/conversation.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L299)

Step index for reconstructing parallel vs sequential tool calls

---

### toolOutputPreview?

> `optional` **toolOutputPreview?**: `string`

Defined in: [types/conversation.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L309)

Head/tail preview of a large tool output.
Only present on tool_result messages where the output exceeded truncation limits.
When `sendToolPreview` is enabled in config, `buildContextMessages()` returns
this value as the message content instead of the full output.

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/conversation.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L311)

Original byte size of the full tool output before any truncation

---

### artifactId?

> `optional` **artifactId?**: `string`

Defined in: [types/conversation.ts:318](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L318)

Artifact store ID for an externalized MCP tool output.
Set when `mcp.outputLimits.strategy = "externalize"` and the tool output
exceeded `maxBytes`. Use retrieve_context with this ID to fetch the full
payload from the local artifact store.

---

### isSkill?

> `optional` **isSkill?**: `boolean`

Defined in: [types/conversation.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L329)

Marks a pinned skill-activation message: the full instructions of a
skill loaded via use_skill, persisted into session history so later
turns replay it verbatim instead of re-fetching the skill. Pinned
skill messages are protected from sliding-window truncation and are
re-included after memory summarization.

---

### skillId?

> `optional` **skillId?**: `string`

Defined in: [types/conversation.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L331)

Skill id of a pinned skill-activation message.

---

### skillName?

> `optional` **skillName?**: `string`

Defined in: [types/conversation.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L333)

Skill name of a pinned skill-activation message.

---

### skillVersion?

> `optional` **skillVersion?**: `number`

Defined in: [types/conversation.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L335)

Skill version captured at activation (sessions pin the activated version).
