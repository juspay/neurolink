[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BudgetCheckResult

# Type Alias: BudgetCheckResult

> **BudgetCheckResult** = `object`

Result of a context budget check.

## Properties

### withinBudget

> **withinBudget**: `boolean`

Whether the request fits within the context window

---

### estimatedInputTokens

> **estimatedInputTokens**: `number`

Estimated total input tokens

---

### availableInputTokens

> **availableInputTokens**: `number`

Available input tokens for this model

---

### usageRatio

> **usageRatio**: `number`

Usage ratio (0.0 - 1.0+)

---

### shouldCompact

> **shouldCompact**: `boolean`

Whether auto-compaction should trigger

---

### breakdown

> **breakdown**: `object`

Breakdown of token usage by category

#### systemPrompt

> **systemPrompt**: `number`

#### conversationHistory

> **conversationHistory**: `number`

#### currentPrompt

> **currentPrompt**: `number`

#### toolDefinitions

> **toolDefinitions**: `number`

#### fileAttachments

> **fileAttachments**: `number`
