[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuleScorerConfig

# Type Alias: RuleScorerConfig

> **RuleScorerConfig** = [`ScorerConfig`](ScorerConfig.md) & `object`

Defined in: [types/scorer.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L181)

Rule-based scorer configuration

## Type Declaration

### rules?

> `optional` **rules?**: [`ScorerRule`](ScorerRule.md)[]

Rules to apply

### ruleCombination?

> `optional` **ruleCombination?**: `"all"` \| `"any"` \| `"weighted"`

How to combine rule results
