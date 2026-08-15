[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryConfig

# Type Alias: ConversationMemoryConfig

> **ConversationMemoryConfig** = `object`

Defined in: [types/conversation.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L72)

Configuration for conversation memory feature

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/conversation.ts:74](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L74)

Enable conversation memory feature

---

### maxSessions?

> `optional` **maxSessions?**: `number`

Defined in: [types/conversation.ts:77](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L77)

Maximum number of sessions to keep in memory (default: 50)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/conversation.ts:80](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L80)

Enable automatic summarization

---

### tokenThreshold?

> `optional` **tokenThreshold?**: `number`

Defined in: [types/conversation.ts:83](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L83)

Token threshold to trigger summarization (optional - defaults to 80% of model context)

---

### summarizationProvider?

> `optional` **summarizationProvider?**: `string`

Defined in: [types/conversation.ts:86](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L86)

Provider to use for summarization

---

### summarizationModel?

> `optional` **summarizationModel?**: `string`

Defined in: [types/conversation.ts:89](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L89)

Model to use for summarization

---

### memory?

> `optional` **memory?**: [`HippocampusMemory`](HippocampusMemory.md)

Defined in: [types/conversation.ts:92](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L92)

Memory SDK config (condensed key-value memory per user). Set enabled: true to activate.

---

### redisConfig?

> `optional` **redisConfig?**: [`RedisStorageConfig`](RedisStorageConfig.md)

Defined in: [types/conversation.ts:95](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L95)

Redis configuration (optional) - overrides environment variables

---

### contextCompaction?

> `optional` **contextCompaction?**: `object`

Defined in: [types/conversation.ts:98](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L98)

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

Defined in: [types/conversation.ts:128](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L128)

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

Defined in: [types/conversation.ts:138](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L138)

#### Deprecated

Use tokenThreshold instead - Maximum number of conversation turns to keep per session (default: 20)

---

### ~~summarizationThresholdTurns?~~

> `optional` **summarizationThresholdTurns?**: `number`

Defined in: [types/conversation.ts:141](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L141)

#### Deprecated

Use tokenThreshold instead - Turn count to trigger summarization

---

### ~~summarizationTargetTurns?~~

> `optional` **summarizationTargetTurns?**: `number`

Defined in: [types/conversation.ts:144](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L144)

#### Deprecated

Use tokenThreshold instead - Target turn count for the summary
