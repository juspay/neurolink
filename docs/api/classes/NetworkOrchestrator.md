[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkOrchestrator

# Class: NetworkOrchestrator

Defined in: [agent/orchestration/orchestrator.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L37)

Network Orchestrator - Central controller for agent networks

## Constructors

### Constructor

> **new NetworkOrchestrator**(`neurolink`, `config?`): `NetworkOrchestrator`

Defined in: [agent/orchestration/orchestrator.ts:53](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L53)

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

Defined in: [agent/orchestration/orchestrator.ts:81](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L81)

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

Defined in: [agent/orchestration/orchestrator.ts:160](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L160)

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

Defined in: [agent/orchestration/orchestrator.ts:209](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L209)

Get a network by ID

#### Parameters

##### networkId

`string`

#### Returns

[`AgentNetwork`](AgentNetwork.md) \| `undefined`

---

### getNetworkInfo()

> **getNetworkInfo**(`networkId`): [`NetworkInfo`](../type-aliases/NetworkInfo.md) \| `undefined`

Defined in: [agent/orchestration/orchestrator.ts:216](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L216)

Get network info

#### Parameters

##### networkId

`string`

#### Returns

[`NetworkInfo`](../type-aliases/NetworkInfo.md) \| `undefined`

---

### getAllNetworks()

> **getAllNetworks**(): [`NetworkInfo`](../type-aliases/NetworkInfo.md)[]

Defined in: [agent/orchestration/orchestrator.ts:223](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L223)

Get all networks

#### Returns

[`NetworkInfo`](../type-aliases/NetworkInfo.md)[]

---

### executeNetwork()

> **executeNetwork**(`networkId`, `input`, `options?`): `Promise`\<[`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>

Defined in: [agent/orchestration/orchestrator.ts:230](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L230)

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

Defined in: [agent/orchestration/orchestrator.ts:376](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L376)

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

Defined in: [agent/orchestration/orchestrator.ts:424](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L424)

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

Defined in: [agent/orchestration/orchestrator.ts:478](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L478)

Pause a network

#### Parameters

##### networkId

`string`

#### Returns

`void`

---

### resumeNetwork()

> **resumeNetwork**(`networkId`): `void`

Defined in: [agent/orchestration/orchestrator.ts:489](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L489)

Resume a network

#### Parameters

##### networkId

`string`

#### Returns

`void`

---

### shutdownNetwork()

> **shutdownNetwork**(`networkId`): `Promise`\<`void`\>

Defined in: [agent/orchestration/orchestrator.ts:500](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L500)

Shutdown a network

#### Parameters

##### networkId

`string`

#### Returns

`Promise`\<`void`\>

---

### coordinateNetworks()

> **coordinateNetworks**(`networkIds`, `task`, `strategy?`): `Promise`\<`Map`\<`string`, [`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>\>

Defined in: [agent/orchestration/orchestrator.ts:534](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L534)

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

Defined in: [agent/orchestration/orchestrator.ts:578](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L578)

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

Defined in: [agent/orchestration/orchestrator.ts:613](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L613)

Get the shared message bus

#### Returns

[`MessageBus`](MessageBus.md)

---

### on()

> **on**(`event`, `handler`): `void`

Defined in: [agent/orchestration/orchestrator.ts:620](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L620)

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

Defined in: [agent/orchestration/orchestrator.ts:627](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L627)

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

Defined in: [agent/orchestration/orchestrator.ts:634](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/agent/orchestration/orchestrator.ts#L634)

Shutdown the orchestrator

#### Returns

`Promise`\<`void`\>
