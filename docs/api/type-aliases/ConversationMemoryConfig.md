[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryConfig

# Type Alias: ConversationMemoryConfig

> **ConversationMemoryConfig** = `object`

Configuration for conversation memory feature

## Properties

### enabled

> **enabled**: `boolean`

Enable conversation memory feature

---

### maxSessions?

> `optional` **maxSessions?**: `number`

Maximum number of sessions to keep in memory (default: 50)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Enable automatic summarization

---

### tokenThreshold?

> `optional` **tokenThreshold?**: `number`

Token threshold to trigger summarization (optional - defaults to 80% of model context)

---

### summarizationProvider?

> `optional` **summarizationProvider?**: `string`

Provider to use for summarization

---

### summarizationModel?

> `optional` **summarizationModel?**: `string`

Model to use for summarization

---

### summarizationTimeoutMs?

> `optional` **summarizationTimeoutMs?**: `number`

Wall-clock cap for one summarization generate call, in milliseconds
(default: 60000). A summary that overruns is dropped, not fatal — the
turn continues without it — so size this for the slowest summary a real
conversation produces rather than losing compaction summaries silently.

---

### memory?

> `optional` **memory?**: [`HippocampusMemory`](HippocampusMemory.md)

Memory SDK config (condensed key-value memory per user). Set enabled: true to activate.

---

### redisConfig?

> `optional` **redisConfig?**: [`RedisStorageConfig`](RedisStorageConfig.md)

Redis configuration (optional) - overrides environment variables

---

### contextCompaction?

> `optional` **contextCompaction?**: `object`

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

#### Deprecated

Use tokenThreshold instead - Maximum number of conversation turns to keep per session (default: 20)

---

### ~~summarizationThresholdTurns?~~

> `optional` **summarizationThresholdTurns?**: `number`

#### Deprecated

Use tokenThreshold instead - Turn count to trigger summarization

---

### ~~summarizationTargetTurns?~~

> `optional` **summarizationTargetTurns?**: `number`

#### Deprecated

Use tokenThreshold instead - Target turn count for the summary
