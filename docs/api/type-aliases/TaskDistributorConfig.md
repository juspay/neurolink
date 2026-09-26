[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskDistributorConfig

# Type Alias: TaskDistributorConfig

> **TaskDistributorConfig** = `object`

Task Distributor configuration

## Properties

### strategy

> **strategy**: [`DistributionStrategy`](DistributionStrategy.md)

Distribution strategy

---

### maxQueueSize?

> `optional` **maxQueueSize?**: `number`

Maximum queue size

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Maximum retries per task

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Retry delay in ms

---

### taskTimeout?

> `optional` **taskTimeout?**: `number`

Task timeout in ms

---

### enableDecomposition?

> `optional` **enableDecomposition?**: `boolean`

Enable task decomposition

---

### skillMatcher?

> `optional` **skillMatcher?**: (`task`, `agent`) => `number`

Custom skill matcher

#### Parameters

##### task

[`DistributableTask`](DistributableTask.md)

##### agent

[`AgentInstance`](AgentInstance.md)

#### Returns

`number`
