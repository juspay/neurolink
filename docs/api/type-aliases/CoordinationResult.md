[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CoordinationResult

# Type Alias: CoordinationResult

> **CoordinationResult** = `object`

Result of a coordinated execution

## Properties

### success

> **success**: `boolean`

Whether coordination was successful

---

### agentResults

> **agentResults**: `Map`\<`string`, [`AgentResult`](AgentResult.md)\>

Results from all agents

---

### steps

> **steps**: [`NetworkExecutionStep`](NetworkExecutionStep.md)[]

Execution steps taken

---

### finalOutput?

> `optional` **finalOutput?**: `string`

Final combined output

---

### errors

> **errors**: `object`[]

Any errors encountered

#### agentId

> **agentId**: `string`

#### error

> **error**: `string`

---

### duration

> **duration**: `number`

Total duration in ms

---

### metadata

> **metadata**: `object`

Execution metadata

#### executionId

> **executionId**: `string`

#### strategy

> **strategy**: [`CoordinationStrategy`](CoordinationStrategy.md)

#### agentsExecuted

> **agentsExecuted**: `number`

#### agentsFailed

> **agentsFailed**: `number`
