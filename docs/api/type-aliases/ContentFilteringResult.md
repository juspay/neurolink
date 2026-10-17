[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContentFilteringResult

# Type Alias: ContentFilteringResult

> **ContentFilteringResult** = `object`

Result from content filtering operation

## Properties

### filteredText

> **filteredText**: `string`

---

### hasChanges

> **hasChanges**: `boolean`

---

### appliedFilters

> **appliedFilters**: `string`[]

---

### filteringStats

> **filteringStats**: `object`

#### regexPatternsApplied

> **regexPatternsApplied**: `number`

Regex patterns that were compiled and run.

#### regexPatternsRejected?

> `optional` **regexPatternsRejected?**: `number`

Regex patterns refused before they ran because they were too long or
could backtrack catastrophically. Invalid patterns are not counted.

#### stringFiltersApplied

> **stringFiltersApplied**: `number`

#### totalMatches

> **totalMatches**: `number`
