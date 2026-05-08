[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BudgetCheckResult

# Type Alias: BudgetCheckResult

> **BudgetCheckResult** = `object`

Defined in: [types/context.ts:639](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L639)

Result of a context budget check.

## Properties

### withinBudget

> **withinBudget**: `boolean`

Defined in: [types/context.ts:641](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L641)

Whether the request fits within the context window

---

### estimatedInputTokens

> **estimatedInputTokens**: `number`

Defined in: [types/context.ts:643](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L643)

Estimated total input tokens

---

### availableInputTokens

> **availableInputTokens**: `number`

Defined in: [types/context.ts:645](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L645)

Available input tokens for this model

---

### usageRatio

> **usageRatio**: `number`

Defined in: [types/context.ts:647](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L647)

Usage ratio (0.0 - 1.0+)

---

### shouldCompact

> **shouldCompact**: `boolean`

Defined in: [types/context.ts:649](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L649)

Whether auto-compaction should trigger

---

### breakdown

> **breakdown**: `object`

Defined in: [types/context.ts:651](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L651)

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
