[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkOrchestrator

# Class: NetworkOrchestrator

Network Orchestrator - Central controller for agent networks

## Constructors

### Constructor

> **new NetworkOrchestrator**(`neurolink`, `config?`): `NetworkOrchestrator`

#### Parameters

##### neurolink

[`NeuroLink`](NeuroLink.md)

##### config?

[`OrchestratorConfig`](../type-aliases/OrchestratorConfig.md)

#### Returns

`NetworkOrchestrator`

## Methods

### createNetwork()

> **createNetwork**(`config`, `mode?`): `Promise`\<[`AgentNetwork`](AgentNetwork.md)\>

Create a new agent network

#### Parameters

##### config

[`AgentNetworkConfig`](../type-aliases/AgentNetworkConfig.md)

##### mode?

[`OrchestrationMode`](../type-aliases/OrchestrationMode.md)

#### Returns

`Promise`\<[`AgentNetwork`](AgentNetwork.md)\>

---

### createHierarchicalNetwork()

> **createHierarchicalNetwork**(`config`, `parentNetworkId?`): `Promise`\<[`AgentNetwork`](AgentNetwork.md)\>

Create a hierarchical network

#### Parameters

##### config

[`HierarchicalNetworkConfig`](../type-aliases/HierarchicalNetworkConfig.md)

##### parentNetworkId?

`string`

#### Returns

`Promise`\<[`AgentNetwork`](AgentNetwork.md)\>

---

### getNetwork()

> **getNetwork**(`networkId`): [`AgentNetwork`](AgentNetwork.md) \| `undefined`

Get a network by ID

#### Parameters

##### networkId

`string`

#### Returns

[`AgentNetwork`](AgentNetwork.md) \| `undefined`

---

### getNetworkInfo()

> **getNetworkInfo**(`networkId`): [`NetworkInfo`](../type-aliases/NetworkInfo.md) \| `undefined`

Get network info

#### Parameters

##### networkId

`string`

#### Returns

[`NetworkInfo`](../type-aliases/NetworkInfo.md) \| `undefined`

---

### getAllNetworks()

> **getAllNetworks**(): [`NetworkInfo`](../type-aliases/NetworkInfo.md)[]

Get all networks

#### Returns

[`NetworkInfo`](../type-aliases/NetworkInfo.md)[]

---

### executeNetwork()

> **executeNetwork**(`networkId`, `input`, `options?`): `Promise`\<[`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>

Execute a network

#### Parameters

##### networkId

`string`

##### input

[`NetworkExecutionInput`](../type-aliases/NetworkExecutionInput.md)

##### options?

[`NetworkExecutionOptions`](../type-aliases/NetworkExecutionOptions.md)

#### Returns

`Promise`\<[`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>

---

### streamNetwork()

> **streamNetwork**(`networkId`, `input`, `options?`): `AsyncIterable`\<[`NetworkStreamChunk`](../type-aliases/NetworkStreamChunk.md)\>

Stream network execution

#### Parameters

##### networkId

`string`

##### input

[`NetworkExecutionInput`](../type-aliases/NetworkExecutionInput.md)

##### options?

[`NetworkExecutionOptions`](../type-aliases/NetworkExecutionOptions.md)

#### Returns

`AsyncIterable`\<[`NetworkStreamChunk`](../type-aliases/NetworkStreamChunk.md)\>

---

### executeHierarchical()

> **executeHierarchical**(`networkId`, `input`, `options?`): `Promise`\<[`HierarchicalExecutionTrace`](../type-aliases/HierarchicalExecutionTrace.md)\>

Execute hierarchical network with delegation

#### Parameters

##### networkId

`string`

##### input

[`NetworkExecutionInput`](../type-aliases/NetworkExecutionInput.md)

##### options?

[`NetworkExecutionOptions`](../type-aliases/NetworkExecutionOptions.md)

#### Returns

`Promise`\<[`HierarchicalExecutionTrace`](../type-aliases/HierarchicalExecutionTrace.md)\>

---

### pauseNetwork()

> **pauseNetwork**(`networkId`): `void`

Pause a network

#### Parameters

##### networkId

`string`

#### Returns

`void`

---

### resumeNetwork()

> **resumeNetwork**(`networkId`): `void`

Resume a network

#### Parameters

##### networkId

`string`

#### Returns

`void`

---

### shutdownNetwork()

> **shutdownNetwork**(`networkId`): `Promise`\<`void`\>

Shutdown a network

#### Parameters

##### networkId

`string`

#### Returns

`Promise`\<`void`\>

---

### coordinateNetworks()

> **coordinateNetworks**(`networkIds`, `task`, `strategy?`): `Promise`\<`Map`\<`string`, [`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>\>

Coordinate multiple networks

#### Parameters

##### networkIds

`string`[]

##### task

`string`

##### strategy?

[`CoordinationStrategy`](../type-aliases/CoordinationStrategy.md) = `"parallel"`

#### Returns

`Promise`\<`Map`\<`string`, [`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>\>

---

### getStats()

> **getStats**(): `object`

Get orchestrator statistics

#### Returns

`object`

##### totalNetworks

> **totalNetworks**: `number`

##### activeExecutions

> **activeExecutions**: `number`

##### queuedExecutions

> **queuedExecutions**: `number`

##### totalExecutions

> **totalExecutions**: `number`

##### networksByState

> **networksByState**: `Record`\<[`NetworkState`](../type-aliases/NetworkState.md), `number`\>

---

### getMessageBus()

> **getMessageBus**(): [`MessageBus`](MessageBus.md)

Get the shared message bus

#### Returns

[`MessageBus`](MessageBus.md)

---

### on()

> **on**(`event`, `handler`): `void`

Subscribe to orchestrator events

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

Unsubscribe from orchestrator events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Shutdown the orchestrator

#### Returns

`Promise`\<`void`\>
