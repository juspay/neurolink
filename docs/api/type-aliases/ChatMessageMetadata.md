[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChatMessageMetadata

# Type Alias: ChatMessageMetadata

> **ChatMessageMetadata** = `object`

Defined in: [types/conversation.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L233)

Metadata associated with a ChatMessage.

## Properties

### isSummary?

> `optional` **isSummary?**: `boolean`

Defined in: [types/conversation.ts:235](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L235)

Is this a summary message?

---

### summarizesFrom?

> `optional` **summarizesFrom?**: `string`

Defined in: [types/conversation.ts:237](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L237)

First message ID that this summary covers

---

### summarizesTo?

> `optional` **summarizesTo?**: `string`

Defined in: [types/conversation.ts:239](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L239)

Last message ID that this summary covers

---

### truncated?

> `optional` **truncated?**: `boolean`

Defined in: [types/conversation.ts:241](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L241)

Was this message truncated due to token limits?

---

### source?

> `optional` **source?**: `string`

Defined in: [types/conversation.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L243)

Source of the message (e.g., provider name, user input)

---

### language?

> `optional` **language?**: `string`

Defined in: [types/conversation.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L245)

Language of the message content

---

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types/conversation.ts:247](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L247)

Confidence score for AI-generated content

---

### timestamp?

> `optional` **timestamp?**: `number`

Defined in: [types/conversation.ts:254](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L254)

Numeric timestamp for internal tracking and efficient comparisons.
Format: Unix epoch milliseconds (number).
Complements the ISO string `ChatMessage.timestamp` field.
Use this for sorting, filtering, and performance-critical operations.

---

### modelUsed?

> `optional` **modelUsed?**: `string`

Defined in: [types/conversation.ts:256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L256)

Model used to generate this message

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Defined in: [types/conversation.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L258)

Unique signature identifying thought/reasoning patterns

---

### thoughtHash?

> `optional` **thoughtHash?**: `string`

Defined in: [types/conversation.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L260)

Hash of the thinking/reasoning content for deduplication

---

### thinkingExpanded?

> `optional` **thinkingExpanded?**: `boolean`

Defined in: [types/conversation.ts:262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L262)

Whether extended thinking was used for this message

---

### stepIndex?

> `optional` **stepIndex?**: `number`

Defined in: [types/conversation.ts:264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L264)

Step index for reconstructing parallel vs sequential tool calls

---

### toolOutputPreview?

> `optional` **toolOutputPreview?**: `string`

Defined in: [types/conversation.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L274)

Head/tail preview of a large tool output.
Only present on tool_result messages where the output exceeded truncation limits.
When `sendToolPreview` is enabled in config, `buildContextMessages()` returns
this value as the message content instead of the full output.

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/conversation.ts:276](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L276)

Original byte size of the full tool output before any truncation

---

### artifactId?

> `optional` **artifactId?**: `string`

Defined in: [types/conversation.ts:283](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L283)

Artifact store ID for an externalized MCP tool output.
Set when `mcp.outputLimits.strategy = "externalize"` and the tool output
exceeded `maxBytes`. Use retrieve_context with this ID to fetch the full
payload from the local artifact store.
