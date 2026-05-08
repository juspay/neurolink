[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExposureManager

# Class: AgentExposureManager

Defined in: [mcp/agentExposure.ts:387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L387)

Agent Exposure Manager

Manages the lifecycle of exposed agents and workflows,
providing registration, lookup, and invocation capabilities.

## Constructors

### Constructor

> **new AgentExposureManager**(`options?`): `AgentExposureManager`

Defined in: [mcp/agentExposure.ts:391](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L391)

#### Parameters

##### options?

[`ExposureOptions`](../type-aliases/ExposureOptions.md) = `{}`

#### Returns

`AgentExposureManager`

## Methods

### exposeAgent()

> **exposeAgent**(`agent`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Defined in: [mcp/agentExposure.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L398)

Expose an agent and register it

#### Parameters

##### agent

[`ExposableAgent`](../type-aliases/ExposableAgent.md)

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

---

### exposeWorkflow()

> **exposeWorkflow**(`workflow`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Defined in: [mcp/agentExposure.ts:407](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L407)

Expose a workflow and register it

#### Parameters

##### workflow

[`ExposableWorkflow`](../type-aliases/ExposableWorkflow.md)

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

---

### getExposedTools()

> **getExposedTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/agentExposure.ts:416](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L416)

Get all exposed tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getExposedTool()

> **getExposedTool**(`toolName`): [`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

Defined in: [mcp/agentExposure.ts:423](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L423)

Get exposed tool by name

#### Parameters

##### toolName

`string`

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

---

### getExposureResult()

> **getExposureResult**(`toolName`): [`ExposureResult`](../type-aliases/ExposureResult.md) \| `undefined`

Defined in: [mcp/agentExposure.ts:430](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L430)

Get exposure result by tool name

#### Parameters

##### toolName

`string`

#### Returns

[`ExposureResult`](../type-aliases/ExposureResult.md) \| `undefined`

---

### getToolsBySourceType()

> **getToolsBySourceType**(`sourceType`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/agentExposure.ts:437](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L437)

Get tools by source type

#### Parameters

##### sourceType

`"agent"` \| `"workflow"`

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### unexpose()

> **unexpose**(`toolName`): `boolean`

Defined in: [mcp/agentExposure.ts:446](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L446)

Remove exposed tool

#### Parameters

##### toolName

`string`

#### Returns

`boolean`

---

### clear()

> **clear**(): `void`

Defined in: [mcp/agentExposure.ts:453](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L453)

Clear all exposed tools

#### Returns

`void`

---

### getStatistics()

> **getStatistics**(): `object`

Defined in: [mcp/agentExposure.ts:460](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/agentExposure.ts#L460)

Get statistics

#### Returns

`object`

##### totalExposed

> **totalExposed**: `number`

##### exposedAgents

> **exposedAgents**: `number`

##### exposedWorkflows

> **exposedWorkflows**: `number`

##### toolNames

> **toolNames**: `string`[]
