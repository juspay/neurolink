[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContentFilteringResult

# Type Alias: ContentFilteringResult

> **ContentFilteringResult** = `object`

Defined in: [types/guardrails.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/guardrails.ts#L133)

Result from content filtering operation

## Properties

### filteredText

> **filteredText**: `string`

Defined in: [types/guardrails.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/guardrails.ts#L134)

---

### hasChanges

> **hasChanges**: `boolean`

Defined in: [types/guardrails.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/guardrails.ts#L135)

---

### appliedFilters

> **appliedFilters**: `string`[]

Defined in: [types/guardrails.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/guardrails.ts#L136)

---

### filteringStats

> **filteringStats**: `object`

Defined in: [types/guardrails.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/guardrails.ts#L137)

#### regexPatternsApplied

> **regexPatternsApplied**: `number`

#### stringFiltersApplied

> **stringFiltersApplied**: `number`

#### totalMatches

> **totalMatches**: `number`
