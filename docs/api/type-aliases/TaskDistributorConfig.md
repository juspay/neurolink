[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskDistributorConfig

# Type Alias: TaskDistributorConfig

> **TaskDistributorConfig** = `object`

Defined in: [types/agentNetwork.ts:1435](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1435)

Task Distributor configuration

## Properties

### strategy

> **strategy**: [`DistributionStrategy`](DistributionStrategy.md)

Defined in: [types/agentNetwork.ts:1437](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1437)

Distribution strategy

---

### maxQueueSize?

> `optional` **maxQueueSize?**: `number`

Defined in: [types/agentNetwork.ts:1440](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1440)

Maximum queue size

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/agentNetwork.ts:1443](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1443)

Maximum retries per task

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Defined in: [types/agentNetwork.ts:1446](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1446)

Retry delay in ms

---

### taskTimeout?

> `optional` **taskTimeout?**: `number`

Defined in: [types/agentNetwork.ts:1449](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1449)

Task timeout in ms

---

### enableDecomposition?

> `optional` **enableDecomposition?**: `boolean`

Defined in: [types/agentNetwork.ts:1452](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1452)

Enable task decomposition

---

### skillMatcher?

> `optional` **skillMatcher?**: (`task`, `agent`) => `number`

Defined in: [types/agentNetwork.ts:1455](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1455)

Custom skill matcher

#### Parameters

##### task

[`DistributableTask`](DistributableTask.md)

##### agent

[`AgentInstance`](AgentInstance.md)

#### Returns

`number`
