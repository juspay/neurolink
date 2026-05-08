[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / JudgeScores

# Type Alias: JudgeScores

> **JudgeScores** = `object`

Defined in: [types/workflow.ts:339](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L339)

Judge scoring results
NOTE: Scores are 0-100 for standardized evaluation

## Properties

### judgeProvider

> **judgeProvider**: `string`

Defined in: [types/workflow.ts:341](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L341)

---

### judgeModel

> **judgeModel**: `string`

Defined in: [types/workflow.ts:342](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L342)

---

### scores

> **scores**: `Record`\<`string`, `number`\>

Defined in: [types/workflow.ts:345](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L345)

---

### ranking?

> `optional` **ranking?**: `string`[]

Defined in: [types/workflow.ts:346](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L346)

---

### bestResponse?

> `optional` **bestResponse?**: `string`

Defined in: [types/workflow.ts:347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L347)

---

### criteria

> **criteria**: `string`[]

Defined in: [types/workflow.ts:350](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L350)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/workflow.ts:351](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L351)

---

### synthesizedResponse?

> `optional` **synthesizedResponse?**: `string`

Defined in: [types/workflow.ts:352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L352)

---

### confidenceInJudgment?

> `optional` **confidenceInJudgment?**: `number`

Defined in: [types/workflow.ts:353](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L353)

---

### judgeTime

> **judgeTime**: `number`

Defined in: [types/workflow.ts:356](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L356)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:359](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L359)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/workflow.ts:360](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L360)
