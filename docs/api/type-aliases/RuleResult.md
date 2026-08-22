[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuleResult

# Type Alias: RuleResult

> **RuleResult** = `object`

Defined in: [types/scorer.ts:207](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L207)

Rule evaluation result

## Properties

### ruleId

> **ruleId**: `string`

Defined in: [types/scorer.ts:209](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L209)

Rule identifier

---

### passed

> **passed**: `boolean`

Defined in: [types/scorer.ts:211](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L211)

Whether the rule passed

---

### score

> **score**: `number`

Defined in: [types/scorer.ts:213](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L213)

Score from this rule

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/scorer.ts:215](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L215)

Reasoning for the result
