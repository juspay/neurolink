[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationCheckParams

# Type Alias: FileSummarizationCheckParams

> **FileSummarizationCheckParams** = `object`

Defined in: [types/context.ts:691](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L691)

Parameters for `shouldSummarizeFiles()`.

## Properties

### provider

> **provider**: `string`

Defined in: [types/context.ts:693](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L693)

AI provider name (e.g. "vertex", "anthropic")

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:695](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L695)

Model name (optional -- falls back to provider default)

---

### systemPromptTokens

> **systemPromptTokens**: `number`

Defined in: [types/context.ts:697](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L697)

Token estimate for the system prompt

---

### conversationHistoryTokens

> **conversationHistoryTokens**: `number`

Defined in: [types/context.ts:699](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L699)

Token estimate for conversation history

---

### currentPromptTokens

> **currentPromptTokens**: `number`

Defined in: [types/context.ts:701](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L701)

Token estimate for the current user prompt

---

### toolDefinitionTokens

> **toolDefinitionTokens**: `number`

Defined in: [types/context.ts:703](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L703)

Token estimate for tool definitions

---

### fileTokens

> **fileTokens**: `number`

Defined in: [types/context.ts:705](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L705)

Token estimate for all attached files (sum)

---

### fileCount?

> `optional` **fileCount?**: `number`

Defined in: [types/context.ts:707](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L707)

Number of attached files

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/context.ts:709](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L709)

Explicit maxTokens (output reserve) from user config

---

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/context.ts:711](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L711)

Context usage fraction that triggers summarization (0.0-1.0, default 0.80)

---

### minTokensPerFile?

> `optional` **minTokensPerFile?**: `number`

Defined in: [types/context.ts:713](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L713)

Minimum tokens per file in the summarization plan

---

### maxTokensPerFile?

> `optional` **maxTokensPerFile?**: `number`

Defined in: [types/context.ts:715](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L715)

Maximum tokens per file in the summarization plan
