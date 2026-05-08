[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / JudgeConfig

# Type Alias: JudgeConfig

> **JudgeConfig** = `object`

Defined in: [types/workflow.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L126)

Judge model configuration
NOTE: Testing phase uses fixed 0-100 scoring scale

## Properties

### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/workflow.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L128)

---

### model

> **model**: `string`

Defined in: [types/workflow.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L129)

---

### criteria

> **criteria**: `string`[]

Defined in: [types/workflow.ts:130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L130)

---

### outputFormat

> **outputFormat**: [`JudgeOutputFormat`](JudgeOutputFormat.md)

Defined in: [types/workflow.ts:131](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L131)

---

### customPrompt?

> `optional` **customPrompt?**: `string`

Defined in: [types/workflow.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L134)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/workflow.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L135)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/workflow.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L136)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/workflow.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L137)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/workflow.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L138)

---

### blindEvaluation?

> `optional` **blindEvaluation?**: `boolean`

Defined in: [types/workflow.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L141)

---

### includeReasoning

> **includeReasoning**: `boolean`

Defined in: [types/workflow.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L142)

---

### synthesizeImprovedResponse?

> `optional` **synthesizeImprovedResponse?**: `boolean`

Defined in: [types/workflow.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L143)

---

### scoreScale

> **scoreScale**: `object`

Defined in: [types/workflow.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L144)

#### min

> **min**: `0`

#### max

> **max**: `100`

---

### label?

> `optional` **label?**: `string`

Defined in: [types/workflow.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L151)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L152)
