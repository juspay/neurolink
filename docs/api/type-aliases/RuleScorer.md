[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuleScorer

# Type Alias: RuleScorer

> **RuleScorer** = [`Scorer`](Scorer.md) & `object`

Defined in: [types/scorer.ts:314](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L314)

Extended interface for rule-based scorers

## Type Declaration

### ruleConfig

> `readonly` **ruleConfig**: [`RuleScorerConfig`](RuleScorerConfig.md)

Rule-specific configuration

### getRules()

> **getRules**(): [`ScorerRule`](ScorerRule.md)[]

Get all rules for this scorer

#### Returns

[`ScorerRule`](ScorerRule.md)[]

Array of rules

### evaluateRule()

> **evaluateRule**(`rule`, `input`): `object`

Evaluate a single rule

#### Parameters

##### rule

[`ScorerRule`](ScorerRule.md)

Rule to evaluate

##### input

[`ScorerInput`](ScorerInput.md)

Scorer input

#### Returns

`object`

Rule result

##### passed

> **passed**: `boolean`

##### score

> **score**: `number`
