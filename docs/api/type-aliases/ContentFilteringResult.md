[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContentFilteringResult

# Type Alias: ContentFilteringResult

> **ContentFilteringResult** = `object`

Defined in: [types/guardrails.ts:133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L133)

Result from content filtering operation

## Properties

### filteredText

> **filteredText**: `string`

Defined in: [types/guardrails.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L134)

---

### hasChanges

> **hasChanges**: `boolean`

Defined in: [types/guardrails.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L135)

---

### appliedFilters

> **appliedFilters**: `string`[]

Defined in: [types/guardrails.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L136)

---

### filteringStats

> **filteringStats**: `object`

Defined in: [types/guardrails.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L137)

#### regexPatternsApplied

> **regexPatternsApplied**: `number`

#### stringFiltersApplied

> **stringFiltersApplied**: `number`

#### totalMatches

> **totalMatches**: `number`
