[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuleResult

# Type Alias: RuleResult

> **RuleResult** = `object`

Defined in: [types/scorer.ts:207](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L207)

Rule evaluation result

## Properties

### ruleId

> **ruleId**: `string`

Defined in: [types/scorer.ts:209](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L209)

Rule identifier

---

### passed

> **passed**: `boolean`

Defined in: [types/scorer.ts:211](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L211)

Whether the rule passed

---

### score

> **score**: `number`

Defined in: [types/scorer.ts:213](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L213)

Score from this rule

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/scorer.ts:215](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L215)

Reasoning for the result
