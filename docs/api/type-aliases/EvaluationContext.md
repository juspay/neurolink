[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationContext

# Type Alias: EvaluationContext

> **EvaluationContext** = `object`

Defined in: [types/evaluation.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L100)

Enhanced evaluation context for comprehensive response assessment

## Properties

### userQuery

> **userQuery**: `string`

Defined in: [types/evaluation.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L101)

---

### aiResponse

> **aiResponse**: `string`

Defined in: [types/evaluation.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L102)

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Defined in: [types/evaluation.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L103)

---

### primaryDomain?

> `optional` **primaryDomain?**: `string`

Defined in: [types/evaluation.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L104)

---

### assistantRole?

> `optional` **assistantRole?**: `string`

Defined in: [types/evaluation.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L105)

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/evaluation.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L106)

#### role

> **role**: `"user"` \| `"assistant"`

#### content

> **content**: `string`

#### timestamp?

> `optional` **timestamp?**: `string`

---

### toolUsage?

> `optional` **toolUsage?**: `object`[]

Defined in: [types/evaluation.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L111)

#### toolName

> **toolName**: `string`

#### input

> **input**: `unknown`

#### output

> **output**: `unknown`

#### executionTime

> **executionTime**: `number`

---

### expectedOutcome?

> `optional` **expectedOutcome?**: `string`

Defined in: [types/evaluation.ts:117](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L117)

---

### evaluationCriteria?

> `optional` **evaluationCriteria?**: `string`[]

Defined in: [types/evaluation.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L118)
