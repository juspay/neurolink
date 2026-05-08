[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryConfig

# Type Alias: ConversationMemoryConfig

> **ConversationMemoryConfig** = `object`

Defined in: [types/conversation.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L45)

Configuration for conversation memory feature

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/conversation.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L47)

Enable conversation memory feature

---

### maxSessions?

> `optional` **maxSessions?**: `number`

Defined in: [types/conversation.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L50)

Maximum number of sessions to keep in memory (default: 50)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/conversation.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L53)

Enable automatic summarization

---

### tokenThreshold?

> `optional` **tokenThreshold?**: `number`

Defined in: [types/conversation.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L56)

Token threshold to trigger summarization (optional - defaults to 80% of model context)

---

### summarizationProvider?

> `optional` **summarizationProvider?**: `string`

Defined in: [types/conversation.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L59)

Provider to use for summarization

---

### summarizationModel?

> `optional` **summarizationModel?**: `string`

Defined in: [types/conversation.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L62)

Model to use for summarization

---

### memory?

> `optional` **memory?**: [`HippocampusMemory`](HippocampusMemory.md)

Defined in: [types/conversation.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L65)

Memory SDK config (condensed key-value memory per user). Set enabled: true to activate.

---

### redisConfig?

> `optional` **redisConfig?**: [`RedisStorageConfig`](RedisStorageConfig.md)

Defined in: [types/conversation.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L68)

Redis configuration (optional) - overrides environment variables

---

### contextCompaction?

> `optional` **contextCompaction?**: `object`

Defined in: [types/conversation.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L71)

Context compaction configuration

#### enabled?

> `optional` **enabled?**: `boolean`

Enable auto-compaction (default: true when summarization enabled)

#### threshold?

> `optional` **threshold?**: `number`

Compaction trigger threshold (0.0-1.0, default: 0.80)

#### enablePruning?

> `optional` **enablePruning?**: `boolean`

Enable tool output pruning (default: true)

#### enableDeduplication?

> `optional` **enableDeduplication?**: `boolean`

Enable file read deduplication (default: true)

#### enableSlidingWindow?

> `optional` **enableSlidingWindow?**: `boolean`

Enable sliding window fallback (default: true)

#### maxToolOutputBytes?

> `optional` **maxToolOutputBytes?**: `number`

Tool output max size in bytes (default: 50KB)

#### maxToolOutputLines?

> `optional` **maxToolOutputLines?**: `number`

Tool output max lines (default: 2000)

#### sendToolPreview?

> `optional` **sendToolPreview?**: `boolean`

When true, buildContextMessages() returns the head/tail preview instead of
the full tool output for tool_result messages. Default: false (full output sent to LLM).
When false (default), the AI receives the complete tool output in content.
When true, the AI receives the truncated preview and can use the retrieve_context
tool to access full output if needed.

#### fileReadBudgetPercent?

> `optional` **fileReadBudgetPercent?**: `number`

File read budget as fraction of remaining context (default: 0.60)

---

### fileSummarization?

> `optional` **fileSummarization?**: `object`

Defined in: [types/conversation.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L101)

Configuration for automatic file content summarization when files exceed context budget

#### enabled?

> `optional` **enabled?**: `boolean`

#### provider?

> `optional` **provider?**: `string`

#### model?

> `optional` **model?**: `string`

#### threshold?

> `optional` **threshold?**: `number`

#### minTokensPerFile?

> `optional` **minTokensPerFile?**: `number`

#### maxTokensPerFile?

> `optional` **maxTokensPerFile?**: `number`

---

### ~~maxTurnsPerSession?~~

> `optional` **maxTurnsPerSession?**: `number`

Defined in: [types/conversation.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L111)

#### Deprecated

Use tokenThreshold instead - Maximum number of conversation turns to keep per session (default: 20)

---

### ~~summarizationThresholdTurns?~~

> `optional` **summarizationThresholdTurns?**: `number`

Defined in: [types/conversation.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L114)

#### Deprecated

Use tokenThreshold instead - Turn count to trigger summarization

---

### ~~summarizationTargetTurns?~~

> `optional` **summarizationTargetTurns?**: `number`

Defined in: [types/conversation.ts:117](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L117)

#### Deprecated

Use tokenThreshold instead - Target turn count for the summary
