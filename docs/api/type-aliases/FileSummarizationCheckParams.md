[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationCheckParams

# Type Alias: FileSummarizationCheckParams

> **FileSummarizationCheckParams** = `object`

Defined in: [types/context.ts:714](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L714)

Parameters for `shouldSummarizeFiles()`.

## Properties

### provider

> **provider**: `string`

Defined in: [types/context.ts:716](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L716)

AI provider name (e.g. "vertex", "anthropic")

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:718](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L718)

Model name (optional -- falls back to provider default)

---

### systemPromptTokens

> **systemPromptTokens**: `number`

Defined in: [types/context.ts:720](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L720)

Token estimate for the system prompt

---

### conversationHistoryTokens

> **conversationHistoryTokens**: `number`

Defined in: [types/context.ts:722](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L722)

Token estimate for conversation history

---

### currentPromptTokens

> **currentPromptTokens**: `number`

Defined in: [types/context.ts:724](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L724)

Token estimate for the current user prompt

---

### toolDefinitionTokens

> **toolDefinitionTokens**: `number`

Defined in: [types/context.ts:726](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L726)

Token estimate for tool definitions

---

### fileTokens

> **fileTokens**: `number`

Defined in: [types/context.ts:728](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L728)

Token estimate for all attached files (sum)

---

### fileCount?

> `optional` **fileCount?**: `number`

Defined in: [types/context.ts:730](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L730)

Number of attached files

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/context.ts:732](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L732)

Explicit maxTokens (output reserve) from user config

---

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/context.ts:734](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L734)

Context usage fraction that triggers summarization (0.0-1.0, default 0.80)

---

### minTokensPerFile?

> `optional` **minTokensPerFile?**: `number`

Defined in: [types/context.ts:736](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L736)

Minimum tokens per file in the summarization plan

---

### maxTokensPerFile?

> `optional` **maxTokensPerFile?**: `number`

Defined in: [types/context.ts:738](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L738)

Maximum tokens per file in the summarization plan
