[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JudgeScores

# Type Alias: JudgeScores

> **JudgeScores** = `object`

Judge scoring results
NOTE: Scores are 0-100 for standardized evaluation

## Properties

### judgeProvider

> **judgeProvider**: `string`

---

### judgeModel

> **judgeModel**: `string`

---

### scores

> **scores**: `Record`\<`string`, `number`\>

---

### ranking?

> `optional` **ranking?**: `string`[]

---

### bestResponse?

> `optional` **bestResponse?**: `string`

---

### criteria

> **criteria**: `string`[]

---

### reasoning?

> `optional` **reasoning?**: `string`

---

### synthesizedResponse?

> `optional` **synthesizedResponse?**: `string`

---

### confidenceInJudgment?

> `optional` **confidenceInJudgment?**: `number`

---

### judgeTime

> **judgeTime**: `number`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

---

### timestamp

> **timestamp**: `string`
