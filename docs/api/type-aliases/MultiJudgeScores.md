[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiJudgeScores

# Type Alias: MultiJudgeScores

> **MultiJudgeScores** = `object`

Defined in: [types/workflow.ts:366](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L366)

Multi-judge voting results

## Properties

### judges

> **judges**: [`JudgeScores`](JudgeScores.md)[]

Defined in: [types/workflow.ts:368](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L368)

---

### averageScores

> **averageScores**: `Record`\<`string`, `number`\>

Defined in: [types/workflow.ts:371](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L371)

---

### aggregatedRanking

> **aggregatedRanking**: `string`[]

Defined in: [types/workflow.ts:372](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L372)

---

### consensusLevel

> **consensusLevel**: `number`

Defined in: [types/workflow.ts:373](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L373)

---

### bestResponse

> **bestResponse**: `string`

Defined in: [types/workflow.ts:376](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L376)

---

### confidence

> **confidence**: `number`

Defined in: [types/workflow.ts:377](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L377)

---

### votingStrategy

> **votingStrategy**: `"average"` \| `"median"` \| `"majority"`

Defined in: [types/workflow.ts:380](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L380)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:381](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L381)

---

### judgeProvider?

> `optional` **judgeProvider?**: `string`

Defined in: [types/workflow.ts:384](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L384)

---

### judgeModel?

> `optional` **judgeModel?**: `string`

Defined in: [types/workflow.ts:385](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L385)

---

### scores

> **scores**: `Record`\<`string`, `number`\>

Defined in: [types/workflow.ts:386](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L386)

---

### ranking?

> `optional` **ranking?**: `string`[]

Defined in: [types/workflow.ts:387](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L387)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/workflow.ts:388](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L388)

---

### confidenceInJudgment?

> `optional` **confidenceInJudgment?**: `number`

Defined in: [types/workflow.ts:389](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L389)

---

### criteria

> **criteria**: `string`[]

Defined in: [types/workflow.ts:390](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L390)

---

### judgeTime

> **judgeTime**: `number`

Defined in: [types/workflow.ts:391](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L391)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/workflow.ts:392](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L392)
