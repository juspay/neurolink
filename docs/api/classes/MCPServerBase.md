[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerBase

# Abstract Class: MCPServerBase

Defined in: [mcp/mcpServerBase.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L67)

Abstract base class for MCP servers

Provides a foundation for creating custom MCP servers with consistent
patterns for tool registration, execution, and lifecycle management.

## Example

```typescript
class MyCustomServer extends MCPServerBase {
  constructor() {
    super({
      id: "my-custom-server",
      name: "My Custom Server",
      description: "Provides custom functionality",
      category: "custom",
    });

    // Register tools in constructor or init
    this.registerTool({
      name: "myTool",
      description: "Does something useful",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
      execute: async (params, context) => {
        return { success: true, data: "result" };
      },
    });
  }
}
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new MCPServerBase**(`config`): `MCPServerBase`

Defined in: [mcp/mcpServerBase.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L73)

#### Parameters

##### config

[`MCPServerBaseConfig`](../type-aliases/MCPServerBaseConfig.md)

#### Returns

`MCPServerBase`

#### Overrides

`EventEmitter.constructor`

## Properties

### config

> `protected` `readonly` **config**: `Required`\<[`MCPServerBaseConfig`](../type-aliases/MCPServerBaseConfig.md)\>

Defined in: [mcp/mcpServerBase.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L68)

---

### tools

> `protected` `readonly` **tools**: `Map`\<`string`, [`MCPServerTool`](../type-aliases/MCPServerTool.md)\>

Defined in: [mcp/mcpServerBase.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L69)

---

### isInitialized

> `protected` **isInitialized**: `boolean` = `false`

Defined in: [mcp/mcpServerBase.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L70)

---

### isRunning

> `protected` **isRunning**: `boolean` = `false`

Defined in: [mcp/mcpServerBase.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L71)

## Accessors

### id

#### Get Signature

> **get** **id**(): `string`

Defined in: [mcp/mcpServerBase.ts:451](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L451)

Server identification

##### Returns

`string`

---

### name

#### Get Signature

> **get** **name**(): `string`

Defined in: [mcp/mcpServerBase.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L455)

##### Returns

`string`

---

### description

#### Get Signature

> **get** **description**(): `string`

Defined in: [mcp/mcpServerBase.ts:459](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L459)

##### Returns

`string`

---

### version

#### Get Signature

> **get** **version**(): `string`

Defined in: [mcp/mcpServerBase.ts:463](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L463)

##### Returns

`string`

---

### category

#### Get Signature

> **get** **category**(): [`MCPServerCategory`](../type-aliases/MCPServerCategory.md)

Defined in: [mcp/mcpServerBase.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L467)

##### Returns

[`MCPServerCategory`](../type-aliases/MCPServerCategory.md)

---

### initialized

#### Get Signature

> **get** **initialized**(): `boolean`

Defined in: [mcp/mcpServerBase.ts:474](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L474)

Check if server is initialized

##### Returns

`boolean`

---

### running

#### Get Signature

> **get** **running**(): `boolean`

Defined in: [mcp/mcpServerBase.ts:481](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L481)

Check if server is running

##### Returns

`boolean`

## Methods

### init()

> **init**(): `Promise`\<`void`\>

Defined in: [mcp/mcpServerBase.ts:94](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L94)

Initialize the server
Override in subclasses for async initialization

#### Returns

`Promise`\<`void`\>

---

### onInit()

> `protected` **onInit**(): `Promise`\<`void`\>

Defined in: [mcp/mcpServerBase.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L111)

Hook for subclass initialization
Override to perform async setup

#### Returns

`Promise`\<`void`\>

---

### start()

> **start**(): `Promise`\<`void`\>

Defined in: [mcp/mcpServerBase.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L118)

Start the server

#### Returns

`Promise`\<`void`\>

---

### onStart()

> `protected` **onStart**(): `Promise`\<`void`\>

Defined in: [mcp/mcpServerBase.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L134)

Hook for subclass start logic

#### Returns

`Promise`\<`void`\>

---

### stop()

> **stop**(`reason?`): `Promise`\<`void`\>

Defined in: [mcp/mcpServerBase.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L141)

Stop the server

#### Parameters

##### reason?

`string`

#### Returns

`Promise`\<`void`\>

---

### onStop()

> `protected` **onStop**(): `Promise`\<`void`\>

Defined in: [mcp/mcpServerBase.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L155)

Hook for subclass stop logic

#### Returns

`Promise`\<`void`\>

---

### registerTool()

> **registerTool**(`tool`): `this`

Defined in: [mcp/mcpServerBase.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L162)

Register a tool with the server

#### Parameters

##### tool

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

#### Returns

`this`

---

### registerTools()

> **registerTools**(`tools`): `this`

Defined in: [mcp/mcpServerBase.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L188)

Register multiple tools at once

#### Parameters

##### tools

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

#### Returns

`this`

---

### validateTool()

> `protected` **validateTool**(`tool`): `void`

Defined in: [mcp/mcpServerBase.ts:198](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L198)

Validate tool configuration

#### Parameters

##### tool

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

#### Returns

`void`

---

### executeTool()

> **executeTool**(`toolName`, `params`, `context?`): `Promise`\<[`ToolResult`](../type-aliases/ToolResult.md)\>

Defined in: [mcp/mcpServerBase.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L250)

Execute a tool by name

#### Parameters

##### toolName

`string`

##### params

`unknown`

##### context?

[`NeuroLinkExecutionContext`](../type-aliases/NeuroLinkExecutionContext.md)

#### Returns

`Promise`\<[`ToolResult`](../type-aliases/ToolResult.md)\>

---

### getTools()

> **getTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/mcpServerBase.ts:348](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L348)

Get all registered tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getTool()

> **getTool**(`name`): [`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

Defined in: [mcp/mcpServerBase.ts:355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L355)

Get a specific tool by name

#### Parameters

##### name

`string`

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

---

### hasTool()

> **hasTool**(`name`): `boolean`

Defined in: [mcp/mcpServerBase.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L362)

Check if a tool exists

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### removeTool()

> **removeTool**(`name`): `boolean`

Defined in: [mcp/mcpServerBase.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L369)

Remove a tool

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### toServerInfo()

> **toServerInfo**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

Defined in: [mcp/mcpServerBase.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L376)

Get server info in MCPServerInfo format

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

---

### getToolsByAnnotation()

> **getToolsByAnnotation**(`annotation`, `value`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/mcpServerBase.ts:405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L405)

Get tools filtered by annotations

#### Parameters

##### annotation

keyof [`MCPToolAnnotations`](../type-aliases/MCPToolAnnotations.md)

##### value

`string` \| `number` \| `boolean` \| `string`[]

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getReadOnlyTools()

> **getReadOnlyTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/mcpServerBase.ts:423](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L423)

Get read-only tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getDestructiveTools()

> **getDestructiveTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/mcpServerBase.ts:430](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L430)

Get destructive tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getIdempotentTools()

> **getIdempotentTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/mcpServerBase.ts:437](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L437)

Get idempotent tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getToolsRequiringConfirmation()

> **getToolsRequiringConfirmation**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Defined in: [mcp/mcpServerBase.ts:444](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpServerBase.ts#L444)

Get tools that require confirmation

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]
