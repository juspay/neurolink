[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuleScorerConfig

# Type Alias: RuleScorerConfig

> **RuleScorerConfig** = [`ScorerConfig`](ScorerConfig.md) & `object`

Defined in: [types/scorer.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/scorer.ts#L181)

Rule-based scorer configuration

## Type Declaration

### rules?

> `optional` **rules?**: [`ScorerRule`](ScorerRule.md)[]

Rules to apply

### ruleCombination?

> `optional` **ruleCombination?**: `"all"` \| `"any"` \| `"weighted"`

How to combine rule results
