[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolIntegrationManager

# Class: ToolIntegrationManager

Defined in: [mcp/toolIntegration.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L386)

Tool Integration Manager

Manages tool execution with middleware and elicitation support.

## Constructors

### Constructor

> **new ToolIntegrationManager**(`elicitationManager?`): `ToolIntegrationManager`

Defined in: [mcp/toolIntegration.ts:391](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L391)

#### Parameters

##### elicitationManager?

[`ElicitationManager`](ElicitationManager.md)

#### Returns

`ToolIntegrationManager`

## Methods

### setElicitationHandler()

> **setElicitationHandler**(`handler`): `void`

Defined in: [mcp/toolIntegration.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L398)

Set the elicitation handler

#### Parameters

##### handler

[`ElicitationHandler`](../type-aliases/ElicitationHandler.md)

#### Returns

`void`

---

### use()

> **use**(`middleware`): `this`

Defined in: [mcp/toolIntegration.ts:405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L405)

Add middleware

#### Parameters

##### middleware

[`ToolMiddleware`](../type-aliases/ToolMiddleware.md)

#### Returns

`this`

---

### registerTool()

> **registerTool**(`tool`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Defined in: [mcp/toolIntegration.ts:413](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L413)

Register a tool with integration

#### Parameters

##### tool

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

---

### executeTool()

> **executeTool**(`toolName`, `params`, `context?`): `Promise`\<`unknown`\>

Defined in: [mcp/toolIntegration.ts:425](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L425)

Execute a tool with full middleware chain

#### Parameters

##### toolName

`string`

##### params

`unknown`

##### context?

[`NeuroLinkExecutionContext`](../type-aliases/NeuroLinkExecutionContext.md)

#### Returns

`Promise`\<`unknown`\>

---

### getTool()

> **getTool**(`name`): [`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

Defined in: [mcp/toolIntegration.ts:477](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L477)

Get registered tool

#### Parameters

##### name

`string`

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

---

### getAllTools()

> **getAllTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/toolIntegration.ts:484](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L484)

Get all registered tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getElicitationManager()

> **getElicitationManager**(): [`ElicitationManager`](ElicitationManager.md)

Defined in: [mcp/toolIntegration.ts:491](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolIntegration.ts#L491)

Get the elicitation manager

#### Returns

[`ElicitationManager`](ElicitationManager.md)
