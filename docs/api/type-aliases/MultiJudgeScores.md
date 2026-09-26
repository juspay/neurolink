[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiJudgeScores

# Type Alias: MultiJudgeScores

> **MultiJudgeScores** = `object`

Multi-judge voting results

## Properties

### judges

> **judges**: [`JudgeScores`](JudgeScores.md)[]

---

### averageScores

> **averageScores**: `Record`\<`string`, `number`\>

---

### aggregatedRanking

> **aggregatedRanking**: `string`[]

---

### consensusLevel

> **consensusLevel**: `number`

---

### bestResponse

> **bestResponse**: `string`

---

### confidence

> **confidence**: `number`

---

### votingStrategy

> **votingStrategy**: `"average"` \| `"median"` \| `"majority"`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

---

### judgeProvider?

> `optional` **judgeProvider?**: `string`

---

### judgeModel?

> `optional` **judgeModel?**: `string`

---

### scores

> **scores**: `Record`\<`string`, `number`\>

---

### ranking?

> `optional` **ranking?**: `string`[]

---

### reasoning?

> `optional` **reasoning?**: `string`

---

### confidenceInJudgment?

> `optional` **confidenceInJudgment?**: `number`

---

### criteria

> **criteria**: `string`[]

---

### judgeTime

> **judgeTime**: `number`

---

### timestamp

> **timestamp**: `string`
