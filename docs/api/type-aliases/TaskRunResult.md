[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskRunResult

# Type Alias: TaskRunResult

> **TaskRunResult** = `object`

Defined in: [types/task.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L190)

## Properties

### taskId

> **taskId**: `string`

Defined in: [types/task.ts:191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L191)

---

### runId

> **runId**: `string`

Defined in: [types/task.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L192)

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/task.ts:193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L193)

---

### output?

> `optional` **output?**: `string`

Defined in: [types/task.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L195)

AI response text

---

### toolCalls?

> `optional` **toolCalls?**: `object`[]

Defined in: [types/task.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L196)

#### name

> **name**: `string`

#### input

> **input**: `unknown`

#### output

> **output**: `unknown`

---

### tokensUsed?

> `optional` **tokensUsed?**: `object`

Defined in: [types/task.ts:201](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L201)

#### input

> **input**: `number`

#### output

> **output**: `number`

---

### durationMs

> **durationMs**: `number`

Defined in: [types/task.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L202)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/task.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L204)

ISO 8601

---

### error?

> `optional` **error?**: `string`

Defined in: [types/task.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L205)
