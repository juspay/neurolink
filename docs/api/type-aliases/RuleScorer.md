[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuleScorer

# Type Alias: RuleScorer

> **RuleScorer** = [`Scorer`](Scorer.md) & `object`

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
