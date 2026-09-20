[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveHistoryBudget

# Function: resolveHistoryBudget()

> **resolveHistoryBudget**(`result`, `compactionThreshold?`): `number`

Defined in: [context/budgetChecker.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/context/budgetChecker.ts#L52)

Tokens the CONVERSATION HISTORY may occupy, i.e. the model's available input
space minus everything that rides alongside it (system prompt, current
prompt, tool definitions, file attachments).

This is the number the compactor must target. Passing it the undeducted
`availableInputTokens` made every stage gate compare history-only tokens
against the WHOLE budget, so compaction only engaged once history alone
exceeded the entire window — with a large MCP tool set a request could sit
far over budget while the compactor reported "nothing to do" and fell through
to emergency truncation.

Returns 0 when the fixed overhead already exceeds the window; callers must
treat that as unrecoverable rather than compacting to an empty history.

## Parameters

### result

[`BudgetCheckResult`](../type-aliases/BudgetCheckResult.md)

### compactionThreshold?

`number`

## Returns

`number`
