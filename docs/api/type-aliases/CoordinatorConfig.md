[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CoordinatorConfig

# Type Alias: CoordinatorConfig

> **CoordinatorConfig** = `object`

Configuration for the coordinator

## Properties

### strategy

> **strategy**: [`CoordinationStrategy`](CoordinationStrategy.md)

Coordination strategy to use

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Maximum concurrent agent executions (for parallel strategy)

---

### agentTimeout?

> `optional` **agentTimeout?**: `number`

Timeout for individual agent execution in ms

---

### continueOnFailure?

> `optional` **continueOnFailure?**: `boolean`

Whether to continue on agent failure

---

### customCoordinator?

> `optional` **customCoordinator?**: (`agents`, `task`, `context`) => `Promise`\<[`CoordinationResult`](CoordinationResult.md)\>

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

Retry configuration

#### maxRetries

> **maxRetries**: `number`

#### retryDelay

> **retryDelay**: `number`

#### backoffMultiplier?

> `optional` **backoffMultiplier?**: `number`
