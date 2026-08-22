[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentCoordinator

# Class: AgentCoordinator

Defined in: [agent/coordination/coordinator.ts:30](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L30)

Agent Coordinator - Orchestrates multi-agent execution

## Constructors

### Constructor

> **new AgentCoordinator**(`config?`): `AgentCoordinator`

Defined in: [agent/coordination/coordinator.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L38)

#### Parameters

##### config?

`Partial`\<[`CoordinatorConfig`](../type-aliases/CoordinatorConfig.md)\>

#### Returns

`AgentCoordinator`

## Methods

### registerAgent()

> **registerAgent**(`agent`): `void`

Defined in: [agent/coordination/coordinator.ts:57](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L57)

Register an agent with the coordinator

#### Parameters

##### agent

[`Agent`](Agent.md)

#### Returns

`void`

---

### unregisterAgent()

> **unregisterAgent**(`agentId`): `void`

Defined in: [agent/coordination/coordinator.ts:65](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L65)

Unregister an agent

#### Parameters

##### agentId

`string`

#### Returns

`void`

---

### getAgents()

> **getAgents**(): [`Agent`](Agent.md)[]

Defined in: [agent/coordination/coordinator.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L72)

Get all registered agents

#### Returns

[`Agent`](Agent.md)[]

---

### getAgentStatus()

> **getAgentStatus**(`agentId`): [`AgentStatus`](../type-aliases/AgentStatus.md) \| `undefined`

Defined in: [agent/coordination/coordinator.ts:79](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L79)

Get agent status

#### Parameters

##### agentId

`string`

#### Returns

[`AgentStatus`](../type-aliases/AgentStatus.md) \| `undefined`

---

### coordinate()

> **coordinate**(`task`, `options?`): `Promise`\<[`CoordinationResult`](../type-aliases/CoordinationResult.md)\>

Defined in: [agent/coordination/coordinator.ts:87](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L87)

Execute a coordinated task across agents

#### Parameters

##### task

`string`

##### options?

`Partial`\<[`CoordinatorConfig`](../type-aliases/CoordinatorConfig.md)\>

#### Returns

`Promise`\<[`CoordinationResult`](../type-aliases/CoordinationResult.md)\>

---

### executeWithDependencies()

> **executeWithDependencies**(`assignments`): `Promise`\<[`CoordinationResult`](../type-aliases/CoordinationResult.md)\>

Defined in: [agent/coordination/coordinator.ts:554](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L554)

Execute multiple task assignments with dependencies

#### Parameters

##### assignments

[`TaskAssignment`](../type-aliases/TaskAssignment.md)[]

#### Returns

`Promise`\<[`CoordinationResult`](../type-aliases/CoordinationResult.md)\>

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [agent/coordination/coordinator.ts:711](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L711)

Update coordinator configuration

#### Parameters

##### config

`Partial`\<[`CoordinatorConfig`](../type-aliases/CoordinatorConfig.md)\>

#### Returns

`void`

---

### on()

> **on**(`event`, `handler`): `void`

Defined in: [agent/coordination/coordinator.ts:718](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L718)

Subscribe to coordinator events

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

Defined in: [agent/coordination/coordinator.ts:725](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/coordination/coordinator.ts#L725)

Unsubscribe from coordinator events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`
