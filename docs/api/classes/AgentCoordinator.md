[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentCoordinator

# Class: AgentCoordinator

Agent Coordinator - Orchestrates multi-agent execution

## Constructors

### Constructor

> **new AgentCoordinator**(`config?`): `AgentCoordinator`

#### Parameters

##### config?

`Partial`\<[`CoordinatorConfig`](../type-aliases/CoordinatorConfig.md)\>

#### Returns

`AgentCoordinator`

## Methods

### registerAgent()

> **registerAgent**(`agent`): `void`

Register an agent with the coordinator

#### Parameters

##### agent

[`Agent`](Agent.md)

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

### getAgents()

> **getAgents**(): [`Agent`](Agent.md)[]

Get all registered agents

#### Returns

[`Agent`](Agent.md)[]

---

### getAgentStatus()

> **getAgentStatus**(`agentId`): [`AgentStatus`](../type-aliases/AgentStatus.md) \| `undefined`

Get agent status

#### Parameters

##### agentId

`string`

#### Returns

[`AgentStatus`](../type-aliases/AgentStatus.md) \| `undefined`

---

### coordinate()

> **coordinate**(`task`, `options?`): `Promise`\<[`CoordinationResult`](../type-aliases/CoordinationResult.md)\>

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

Execute multiple task assignments with dependencies

#### Parameters

##### assignments

[`TaskAssignment`](../type-aliases/TaskAssignment.md)[]

#### Returns

`Promise`\<[`CoordinationResult`](../type-aliases/CoordinationResult.md)\>

---

### updateConfig()

> **updateConfig**(`config`): `void`

Update coordinator configuration

#### Parameters

##### config

`Partial`\<[`CoordinatorConfig`](../type-aliases/CoordinatorConfig.md)\>

#### Returns

`void`

---

### on()

> **on**(`event`, `handler`): `void`

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

Unsubscribe from coordinator events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`
