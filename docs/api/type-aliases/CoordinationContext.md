[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CoordinationContext

# Type Alias: CoordinationContext

> **CoordinationContext** = [`AgentExecutionContext`](AgentExecutionContext.md) & `object`

Defined in: [types/agentNetwork.ts:1255](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1255)

Context passed during coordination

## Type Declaration

### currentStep

> **currentStep**: `number`

Current execution step

### totalSteps?

> `optional` **totalSteps?**: `number`

Total expected steps

### previousResults

> **previousResults**: `Map`\<`string`, [`AgentResult`](AgentResult.md)\>

Results from previous agents

### sharedState

> **sharedState**: `Map`\<`string`, `unknown`\>

Shared state across agents

### metadata

> **metadata**: `object`

Coordination metadata

#### metadata.startTime

> **startTime**: `number`

#### metadata.strategy

> **strategy**: [`CoordinationStrategy`](CoordinationStrategy.md)

#### metadata.executionId

> **executionId**: `string`
