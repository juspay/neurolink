[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExposureManager

# Class: AgentExposureManager

Agent Exposure Manager

Manages the lifecycle of exposed agents and workflows,
providing registration, lookup, and invocation capabilities.

## Constructors

### Constructor

> **new AgentExposureManager**(`options?`): `AgentExposureManager`

#### Parameters

##### options?

[`ExposureOptions`](../type-aliases/ExposureOptions.md) = `{}`

#### Returns

`AgentExposureManager`

## Methods

### exposeAgent()

> **exposeAgent**(`agent`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Expose an agent and register it

#### Parameters

##### agent

[`ExposableAgent`](../type-aliases/ExposableAgent.md)

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

---

### exposeWorkflow()

> **exposeWorkflow**(`workflow`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Expose a workflow and register it

#### Parameters

##### workflow

[`ExposableWorkflow`](../type-aliases/ExposableWorkflow.md)

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

---

### getExposedTools()

> **getExposedTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Get all exposed tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getExposedTool()

> **getExposedTool**(`toolName`): [`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

Get exposed tool by name

#### Parameters

##### toolName

`string`

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

---

### getExposureResult()

> **getExposureResult**(`toolName`): [`ExposureResult`](../type-aliases/ExposureResult.md) \| `undefined`

Get exposure result by tool name

#### Parameters

##### toolName

`string`

#### Returns

[`ExposureResult`](../type-aliases/ExposureResult.md) \| `undefined`

---

### getToolsBySourceType()

> **getToolsBySourceType**(`sourceType`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Get tools by source type

#### Parameters

##### sourceType

`"agent"` \| `"workflow"`

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### unexpose()

> **unexpose**(`toolName`): `boolean`

Remove exposed tool

#### Parameters

##### toolName

`string`

#### Returns

`boolean`

---

### clear()

> **clear**(): `void`

Clear all exposed tools

#### Returns

`void`

---

### getStatistics()

> **getStatistics**(): `object`

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
