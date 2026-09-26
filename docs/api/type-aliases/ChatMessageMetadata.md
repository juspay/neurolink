[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChatMessageMetadata

# Type Alias: ChatMessageMetadata

> **ChatMessageMetadata** = `object`

Metadata associated with a ChatMessage.

## Properties

### isSummary?

> `optional` **isSummary?**: `boolean`

Is this a summary message?

---

### summarizesFrom?

> `optional` **summarizesFrom?**: `string`

First message ID that this summary covers

---

### summarizesTo?

> `optional` **summarizesTo?**: `string`

Last message ID that this summary covers

---

### truncated?

> `optional` **truncated?**: `boolean`

Was this message truncated due to token limits?

---

### source?

> `optional` **source?**: `string`

Source of the message (e.g., provider name, user input)

---

### language?

> `optional` **language?**: `string`

Language of the message content

---

### confidence?

> `optional` **confidence?**: `number`

Confidence score for AI-generated content

---

### timestamp?

> `optional` **timestamp?**: `number`

Numeric timestamp for internal tracking and efficient comparisons.
Format: Unix epoch milliseconds (number).
Complements the ISO string `ChatMessage.timestamp` field.
Use this for sorting, filtering, and performance-critical operations.

---

### modelUsed?

> `optional` **modelUsed?**: `string`

Model used to generate this message

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Unique signature identifying thought/reasoning patterns

---

### thoughtHash?

> `optional` **thoughtHash?**: `string`

Hash of the thinking/reasoning content for deduplication

---

### thinkingExpanded?

> `optional` **thinkingExpanded?**: `boolean`

Whether extended thinking was used for this message

---

### stepIndex?

> `optional` **stepIndex?**: `number`

Step index for reconstructing parallel vs sequential tool calls

---

### toolOutputPreview?

> `optional` **toolOutputPreview?**: `string`

Head/tail preview of a large tool output.
Only present on tool_result messages where the output exceeded truncation limits.
When `sendToolPreview` is enabled in config, `buildContextMessages()` returns
this value as the message content instead of the full output.

---

### originalSize?

> `optional` **originalSize?**: `number`

Original byte size of the full tool output before any truncation

---

### artifactId?

> `optional` **artifactId?**: `string`

Artifact store ID for an externalized MCP tool output.
Set when `mcp.outputLimits.strategy = "externalize"` and the tool output
exceeded `maxBytes`. Use retrieve_context with this ID to fetch the full
payload from the local artifact store.

---

### isSkill?

> `optional` **isSkill?**: `boolean`

Marks a pinned skill-activation message: the full instructions of a
skill loaded via use_skill, persisted into session history so later
turns replay it verbatim instead of re-fetching the skill. Pinned
skill messages are protected from sliding-window truncation and are
re-included after memory summarization.

---

### skillId?

> `optional` **skillId?**: `string`

Skill id of a pinned skill-activation message.

---

### skillName?

> `optional` **skillName?**: `string`

Skill name of a pinned skill-activation message.

---

### skillVersion?

> `optional` **skillVersion?**: `number`

Skill version captured at activation (sessions pin the activated version).
