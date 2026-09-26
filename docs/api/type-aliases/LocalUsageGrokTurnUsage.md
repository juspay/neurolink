[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGrokTurnUsage

# Type Alias: LocalUsageGrokTurnUsage

> **LocalUsageGrokTurnUsage** = `object`

The `usage` object on a Grok Build `turn_completed` session update, as
appended to a session's `updates.jsonl`. camelCase, from the CLI's own
serde definitions and confirmed on a real run. `modelUsage` holds the same
shape per model id; `numTurns` is the process ledger's turn counter, which
is how a reader tells a cumulative run from a fresh one — see
`grokReader.ts`.

## Properties

### inputTokens?

> `optional` **inputTokens?**: `number`

---

### outputTokens?

> `optional` **outputTokens?**: `number`

---

### cachedReadTokens?

> `optional` **cachedReadTokens?**: `number`

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

---

### modelCalls?

> `optional` **modelCalls?**: `number`

---

### numTurns?

> `optional` **numTurns?**: `number`

---

### modelUsage?

> `optional` **modelUsage?**: `Record`\<`string`, `unknown`\>
