[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuleScorer

# Type Alias: RuleScorer

> **RuleScorer** = [`Scorer`](Scorer.md) & `object`

Defined in: [types/scorer.ts:314](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L314)

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
