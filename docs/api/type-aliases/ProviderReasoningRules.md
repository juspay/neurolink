[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderReasoningRules

# Type Alias: ProviderReasoningRules

> **ProviderReasoningRules** = `object`

Thinking defaults and per-model budgets (Gemini).

## Properties

### defaultLevel

> **defaultLevel**: `string`

---

### defaultBudgetTokens

> **defaultBudgetTokens**: `number`

---

### levelFractions

> **levelFractions**: `Record`\<`string`, `number`\>

Fraction of the budget range per thinking level.

---

### maxBudgetTokens

> **maxBudgetTokens**: `object`

#### rules

> **rules**: [`ProviderModelRule`](ProviderModelRule.md)\<\{ `value`: `number`; \}\>[]

#### default

> **default**: `number`

---

### budgetRanges

> **budgetRanges**: `object`

thinkingBudget bounds a model accepts; the first matching rule wins.

#### rules

> **rules**: [`ProviderModelRule`](ProviderModelRule.md)\<\{ `min`: `number`; `max`: `number`; \}\>[]

#### fallback

> **fallback**: `object`

##### fallback.min

> **min**: `number`

##### fallback.max

> **max**: `number`

---

### restrictedOutputTokenLimit

> **restrictedOutputTokenLimit**: `number`
