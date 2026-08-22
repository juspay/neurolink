[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CoordinationResult

# Type Alias: CoordinationResult

> **CoordinationResult** = `object`

Defined in: [types/agentNetwork.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1279)

Result of a coordinated execution

## Properties

### success

> **success**: `boolean`

Defined in: [types/agentNetwork.ts:1281](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1281)

Whether coordination was successful

---

### agentResults

> **agentResults**: `Map`\<`string`, [`AgentResult`](AgentResult.md)\>

Defined in: [types/agentNetwork.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1284)

Results from all agents

---

### steps

> **steps**: [`NetworkExecutionStep`](NetworkExecutionStep.md)[]

Defined in: [types/agentNetwork.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1287)

Execution steps taken

---

### finalOutput?

> `optional` **finalOutput?**: `string`

Defined in: [types/agentNetwork.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1290)

Final combined output

---

### errors

> **errors**: `object`[]

Defined in: [types/agentNetwork.ts:1293](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1293)

Any errors encountered

#### agentId

> **agentId**: `string`

#### error

> **error**: `string`

---

### duration

> **duration**: `number`

Defined in: [types/agentNetwork.ts:1296](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1296)

Total duration in ms

---

### metadata

> **metadata**: `object`

Defined in: [types/agentNetwork.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1299)

Execution metadata

#### executionId

> **executionId**: `string`

#### strategy

> **strategy**: [`CoordinationStrategy`](CoordinationStrategy.md)

#### agentsExecuted

> **agentsExecuted**: `number`

#### agentsFailed

> **agentsFailed**: `number`
