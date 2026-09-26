[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationCheckParams

# Type Alias: FileSummarizationCheckParams

> **FileSummarizationCheckParams** = `object`

Parameters for `shouldSummarizeFiles()`.

## Properties

### provider

> **provider**: `string`

AI provider name (e.g. "vertex", "anthropic")

---

### model?

> `optional` **model?**: `string`

Model name (optional -- falls back to provider default)

---

### systemPromptTokens

> **systemPromptTokens**: `number`

Token estimate for the system prompt

---

### conversationHistoryTokens

> **conversationHistoryTokens**: `number`

Token estimate for conversation history

---

### currentPromptTokens

> **currentPromptTokens**: `number`

Token estimate for the current user prompt

---

### toolDefinitionTokens

> **toolDefinitionTokens**: `number`

Token estimate for tool definitions

---

### fileTokens

> **fileTokens**: `number`

Token estimate for all attached files (sum)

---

### fileCount?

> `optional` **fileCount?**: `number`

Number of attached files

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Explicit maxTokens (output reserve) from user config

---

### threshold?

> `optional` **threshold?**: `number`

Context usage fraction that triggers summarization (0.0-1.0, default 0.80)

---

### minTokensPerFile?

> `optional` **minTokensPerFile?**: `number`

Minimum tokens per file in the summarization plan

---

### maxTokensPerFile?

> `optional` **maxTokensPerFile?**: `number`

Maximum tokens per file in the summarization plan
