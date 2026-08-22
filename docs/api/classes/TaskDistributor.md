[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskDistributor

# Class: TaskDistributor

Defined in: [agent/coordination/task-distributor.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L39)

Task Distributor - Manages task distribution across agents

## Constructors

### Constructor

> **new TaskDistributor**(`config`): `TaskDistributor`

Defined in: [agent/coordination/task-distributor.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L48)

#### Parameters

##### config

[`TaskDistributorConfig`](../type-aliases/TaskDistributorConfig.md)

#### Returns

`TaskDistributor`

## Methods

### registerAgent()

> **registerAgent**(`agent`, `capability?`): `void`

Defined in: [agent/coordination/task-distributor.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L68)

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

Defined in: [agent/coordination/task-distributor.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L91)

Unregister an agent

#### Parameters

##### agentId

`string`

#### Returns

`void`

---

### updateCapability()

> **updateCapability**(`agentId`, `update`): `void`

Defined in: [agent/coordination/task-distributor.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L99)

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

Defined in: [agent/coordination/task-distributor.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L109)

Submit a task for distribution

#### Parameters

##### task

[`DistributableTask`](../type-aliases/DistributableTask.md)

#### Returns

`Promise`\<[`DistributionResult`](../type-aliases/DistributionResult.md)\>

---

### submitTasks()

> **submitTasks**(`tasks`): `Promise`\<[`DistributionResult`](../type-aliases/DistributionResult.md)[]\>

Defined in: [agent/coordination/task-distributor.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L168)

Submit multiple tasks

#### Parameters

##### tasks

[`DistributableTask`](../type-aliases/DistributableTask.md)[]

#### Returns

`Promise`\<[`DistributionResult`](../type-aliases/DistributionResult.md)[]\>

---

### decomposeTask()

> **decomposeTask**(`task`, `analysis`): `Promise`\<[`DistributableTask`](../type-aliases/DistributableTask.md)[]\>

Defined in: [agent/coordination/task-distributor.ts:175](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L175)

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

Defined in: [agent/coordination/task-distributor.ts:583](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L583)

Broadcast a task to all agents

#### Parameters

##### task

[`DistributableTask`](../type-aliases/DistributableTask.md)

#### Returns

`Promise`\<`Map`\<`string`, [`DistributionResult`](../type-aliases/DistributionResult.md)\>\>

---

### getTaskResult()

> **getTaskResult**(`taskId`): [`DistributionResult`](../type-aliases/DistributionResult.md) \| `undefined`

Defined in: [agent/coordination/task-distributor.ts:624](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L624)

Get task result

#### Parameters

##### taskId

`string`

#### Returns

[`DistributionResult`](../type-aliases/DistributionResult.md) \| `undefined`

---

### getQueueStatus()

> **getQueueStatus**(): `object`

Defined in: [agent/coordination/task-distributor.ts:631](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L631)

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

Defined in: [agent/coordination/task-distributor.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L666)

Clear completed/failed tasks

#### Returns

`void`

---

### on()

> **on**(`event`, `handler`): `void`

Defined in: [agent/coordination/task-distributor.ts:702](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L702)

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

Defined in: [agent/coordination/task-distributor.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/agent/coordination/task-distributor.ts#L709)

Unsubscribe from distributor events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`
