[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolIntegrationManager

# Class: ToolIntegrationManager

Tool Integration Manager

Manages tool execution with middleware and elicitation support.

## Constructors

### Constructor

> **new ToolIntegrationManager**(`elicitationManager?`): `ToolIntegrationManager`

#### Parameters

##### elicitationManager?

[`ElicitationManager`](ElicitationManager.md)

#### Returns

`ToolIntegrationManager`

## Methods

### setElicitationHandler()

> **setElicitationHandler**(`handler`): `void`

Set the elicitation handler

#### Parameters

##### handler

[`ElicitationHandler`](../type-aliases/ElicitationHandler.md)

#### Returns

`void`

---

### use()

> **use**(`middleware`): `this`

Add middleware

#### Parameters

##### middleware

[`ToolMiddleware`](../type-aliases/ToolMiddleware.md)

#### Returns

`this`

---

### registerTool()

> **registerTool**(`tool`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Register a tool with integration

#### Parameters

##### tool

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

---

### executeTool()

> **executeTool**(`toolName`, `params`, `context?`): `Promise`\<`unknown`\>

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

Get registered tool

#### Parameters

##### name

`string`

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

---

### getAllTools()

> **getAllTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Get all registered tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getElicitationManager()

> **getElicitationManager**(): [`ElicitationManager`](ElicitationManager.md)

Get the elicitation manager

#### Returns

[`ElicitationManager`](ElicitationManager.md)
