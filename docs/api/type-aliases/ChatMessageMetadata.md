[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChatMessageMetadata

# Type Alias: ChatMessageMetadata

> **ChatMessageMetadata** = `object`

Defined in: [types/conversation.ts:260](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L260)

Metadata associated with a ChatMessage.

## Properties

### isSummary?

> `optional` **isSummary?**: `boolean`

Defined in: [types/conversation.ts:262](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L262)

Is this a summary message?

---

### summarizesFrom?

> `optional` **summarizesFrom?**: `string`

Defined in: [types/conversation.ts:264](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L264)

First message ID that this summary covers

---

### summarizesTo?

> `optional` **summarizesTo?**: `string`

Defined in: [types/conversation.ts:266](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L266)

Last message ID that this summary covers

---

### truncated?

> `optional` **truncated?**: `boolean`

Defined in: [types/conversation.ts:268](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L268)

Was this message truncated due to token limits?

---

### source?

> `optional` **source?**: `string`

Defined in: [types/conversation.ts:270](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L270)

Source of the message (e.g., provider name, user input)

---

### language?

> `optional` **language?**: `string`

Defined in: [types/conversation.ts:272](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L272)

Language of the message content

---

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types/conversation.ts:274](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L274)

Confidence score for AI-generated content

---

### timestamp?

> `optional` **timestamp?**: `number`

Defined in: [types/conversation.ts:281](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L281)

Numeric timestamp for internal tracking and efficient comparisons.
Format: Unix epoch milliseconds (number).
Complements the ISO string `ChatMessage.timestamp` field.
Use this for sorting, filtering, and performance-critical operations.

---

### modelUsed?

> `optional` **modelUsed?**: `string`

Defined in: [types/conversation.ts:283](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L283)

Model used to generate this message

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Defined in: [types/conversation.ts:285](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L285)

Unique signature identifying thought/reasoning patterns

---

### thoughtHash?

> `optional` **thoughtHash?**: `string`

Defined in: [types/conversation.ts:287](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L287)

Hash of the thinking/reasoning content for deduplication

---

### thinkingExpanded?

> `optional` **thinkingExpanded?**: `boolean`

Defined in: [types/conversation.ts:289](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L289)

Whether extended thinking was used for this message

---

### stepIndex?

> `optional` **stepIndex?**: `number`

Defined in: [types/conversation.ts:291](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L291)

Step index for reconstructing parallel vs sequential tool calls

---

### toolOutputPreview?

> `optional` **toolOutputPreview?**: `string`

Defined in: [types/conversation.ts:301](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L301)

Head/tail preview of a large tool output.
Only present on tool_result messages where the output exceeded truncation limits.
When `sendToolPreview` is enabled in config, `buildContextMessages()` returns
this value as the message content instead of the full output.

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/conversation.ts:303](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L303)

Original byte size of the full tool output before any truncation

---

### artifactId?

> `optional` **artifactId?**: `string`

Defined in: [types/conversation.ts:310](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L310)

Artifact store ID for an externalized MCP tool output.
Set when `mcp.outputLimits.strategy = "externalize"` and the tool output
exceeded `maxBytes`. Use retrieve_context with this ID to fetch the full
payload from the local artifact store.

---

### isSkill?

> `optional` **isSkill?**: `boolean`

Defined in: [types/conversation.ts:321](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L321)

Marks a pinned skill-activation message: the full instructions of a
skill loaded via use_skill, persisted into session history so later
turns replay it verbatim instead of re-fetching the skill. Pinned
skill messages are protected from sliding-window truncation and are
re-included after memory summarization.

---

### skillId?

> `optional` **skillId?**: `string`

Defined in: [types/conversation.ts:323](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L323)

Skill id of a pinned skill-activation message.

---

### skillName?

> `optional` **skillName?**: `string`

Defined in: [types/conversation.ts:325](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L325)

Skill name of a pinned skill-activation message.

---

### skillVersion?

> `optional` **skillVersion?**: `number`

Defined in: [types/conversation.ts:327](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L327)

Skill version captured at activation (sessions pin the activated version).
