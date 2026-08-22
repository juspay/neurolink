[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CoordinatorConfig

# Type Alias: CoordinatorConfig

> **CoordinatorConfig** = `object`

Defined in: [types/agentNetwork.ts:1224](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1224)

Configuration for the coordinator

## Properties

### strategy

> **strategy**: [`CoordinationStrategy`](CoordinationStrategy.md)

Defined in: [types/agentNetwork.ts:1226](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1226)

Coordination strategy to use

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/agentNetwork.ts:1229](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1229)

Maximum concurrent agent executions (for parallel strategy)

---

### agentTimeout?

> `optional` **agentTimeout?**: `number`

Defined in: [types/agentNetwork.ts:1232](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1232)

Timeout for individual agent execution in ms

---

### continueOnFailure?

> `optional` **continueOnFailure?**: `boolean`

Defined in: [types/agentNetwork.ts:1235](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1235)

Whether to continue on agent failure

---

### customCoordinator?

> `optional` **customCoordinator?**: (`agents`, `task`, `context`) => `Promise`\<[`CoordinationResult`](CoordinationResult.md)\>

Defined in: [types/agentNetwork.ts:1238](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1238)

Custom coordination logic (for custom strategy)

#### Parameters

##### agents

[`AgentInstance`](AgentInstance.md)[]

##### task

`string`

##### context

[`CoordinationContext`](CoordinationContext.md)

#### Returns

`Promise`\<[`CoordinationResult`](CoordinationResult.md)\>

---

### retry?

> `optional` **retry?**: `object`

Defined in: [types/agentNetwork.ts:1245](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1245)

Retry configuration

#### maxRetries

> **maxRetries**: `number`

#### retryDelay

> **retryDelay**: `number`

#### backoffMultiplier?

> `optional` **backoffMultiplier?**: `number`
