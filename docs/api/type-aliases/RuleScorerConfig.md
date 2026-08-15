[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuleScorerConfig

# Type Alias: RuleScorerConfig

> **RuleScorerConfig** = [`ScorerConfig`](ScorerConfig.md) & `object`

Defined in: [types/scorer.ts:181](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L181)

Rule-based scorer configuration

## Type Declaration

### rules?

> `optional` **rules?**: [`ScorerRule`](ScorerRule.md)[]

Rules to apply

### ruleCombination?

> `optional` **ruleCombination?**: `"all"` \| `"any"` \| `"weighted"`

How to combine rule results
