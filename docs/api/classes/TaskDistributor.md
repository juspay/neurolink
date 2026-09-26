[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskDistributor

# Class: TaskDistributor

Task Distributor - Manages task distribution across agents

## Constructors

### Constructor

> **new TaskDistributor**(`config`): `TaskDistributor`

#### Parameters

##### config

[`TaskDistributorConfig`](../type-aliases/TaskDistributorConfig.md)

#### Returns

`TaskDistributor`

## Methods

### registerAgent()

> **registerAgent**(`agent`, `capability?`): `void`

Register an agent with capabilities

#### Parameters

##### agent

[`Agent`](Agent.md)

##### capability?

`Partial`\<[`AgentCapability`](../type-aliases/AgentCapability.md)\>

#### Returns

`void`

---

### unregisterAgent()

> **unregisterAgent**(`agentId`): `void`

Unregister an agent

#### Parameters

##### agentId

`string`

#### Returns

`void`

---

### updateCapability()

> **updateCapability**(`agentId`, `update`): `void`

Update agent capability

#### Parameters

##### agentId

`string`

##### update

`Partial`\<[`AgentCapability`](../type-aliases/AgentCapability.md)\>

#### Returns

`void`

---

### submitTask()

> **submitTask**(`task`): `Promise`\<[`DistributionResult`](../type-aliases/DistributionResult.md)\>

Submit a task for distribution

#### Parameters

##### task

[`DistributableTask`](../type-aliases/DistributableTask.md)

#### Returns

`Promise`\<[`DistributionResult`](../type-aliases/DistributionResult.md)\>

---

### submitTasks()

> **submitTasks**(`tasks`): `Promise`\<[`DistributionResult`](../type-aliases/DistributionResult.md)[]\>

Submit multiple tasks

#### Parameters

##### tasks

[`DistributableTask`](../type-aliases/DistributableTask.md)[]

#### Returns

`Promise`\<[`DistributionResult`](../type-aliases/DistributionResult.md)[]\>

---

### decomposeTask()

> **decomposeTask**(`task`, `analysis`): `Promise`\<[`DistributableTask`](../type-aliases/DistributableTask.md)[]\>

Decompose a complex task into subtasks

#### Parameters

##### task

[`DistributableTask`](../type-aliases/DistributableTask.md)

##### analysis

[`TaskAnalysis`](../type-aliases/TaskAnalysis.md)

#### Returns

`Promise`\<[`DistributableTask`](../type-aliases/DistributableTask.md)[]\>

---

### broadcastTask()

> **broadcastTask**(`task`): `Promise`\<`Map`\<`string`, [`DistributionResult`](../type-aliases/DistributionResult.md)\>\>

Broadcast a task to all agents

#### Parameters

##### task

[`DistributableTask`](../type-aliases/DistributableTask.md)

#### Returns

`Promise`\<`Map`\<`string`, [`DistributionResult`](../type-aliases/DistributionResult.md)\>\>

---

### getTaskResult()

> **getTaskResult**(`taskId`): [`DistributionResult`](../type-aliases/DistributionResult.md) \| `undefined`

Get task result

#### Parameters

##### taskId

`string`

#### Returns

[`DistributionResult`](../type-aliases/DistributionResult.md) \| `undefined`

---

### getQueueStatus()

> **getQueueStatus**(): `object`

Get queue status

#### Returns

`object`

##### pending

> **pending**: `number`

##### active

> **active**: `number`

##### completed

> **completed**: `number`

##### failed

> **failed**: `number`

---

### clearCompleted()

> **clearCompleted**(): `void`

Clear completed/failed tasks

#### Returns

`void`

---

### on()

> **on**(`event`, `handler`): `void`

Subscribe to distributor events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`

---

### off()

> **off**(`event`, `handler`): `void`

Unsubscribe from distributor events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`
