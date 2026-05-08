[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientAgentExecuteResult

# Type Alias: ClientAgentExecuteResult

> **ClientAgentExecuteResult** = `object`

Defined in: [types/client.ts:321](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L321)

Agent execution result

## Properties

### content

> **content**: `string`

Defined in: [types/client.ts:323](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L323)

Response content

---

### agentId

> **agentId**: `string`

Defined in: [types/client.ts:325](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L325)

Agent ID

---

### sessionId

> **sessionId**: `string`

Defined in: [types/client.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L327)

Session ID

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/client.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L329)

Tools used

---

### toolExecutions?

> `optional` **toolExecutions?**: `object`[]

Defined in: [types/client.ts:331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L331)

Tool executions

#### name

> **name**: `string`

#### input

> **input**: [`UnknownRecord`](UnknownRecord.md)

#### output

> **output**: `unknown`

#### duration

> **duration**: `number`

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/client.ts:338](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L338)

Token usage

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/client.ts:344](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L344)

Response metadata
