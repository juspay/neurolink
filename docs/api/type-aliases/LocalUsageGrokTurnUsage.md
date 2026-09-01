[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGrokTurnUsage

# Type Alias: LocalUsageGrokTurnUsage

> **LocalUsageGrokTurnUsage** = `object`

Defined in: [types/localUsage.ts:365](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L365)

The `usage` object on a Grok Build `turn_completed` session update, as
appended to a session's `updates.jsonl`. camelCase, from the CLI's own
serde definitions and confirmed on a real run. `modelUsage` holds the same
shape per model id; `numTurns` is the process ledger's turn counter, which
is how a reader tells a cumulative run from a fresh one — see
`grokReader.ts`.

## Properties

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/localUsage.ts:366](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L366)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/localUsage.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L367)

---

### cachedReadTokens?

> `optional` **cachedReadTokens?**: `number`

Defined in: [types/localUsage.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L368)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/localUsage.ts:369](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L369)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/localUsage.ts:370](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L370)

---

### modelCalls?

> `optional` **modelCalls?**: `number`

Defined in: [types/localUsage.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L371)

---

### numTurns?

> `optional` **numTurns?**: `number`

Defined in: [types/localUsage.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L372)

---

### modelUsage?

> `optional` **modelUsage?**: `Record`\<`string`, `unknown`\>

Defined in: [types/localUsage.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L373)
