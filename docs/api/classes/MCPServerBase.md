[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerBase

# Abstract Class: MCPServerBase

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

---

### tools

> `protected` `readonly` **tools**: `Map`\<`string`, [`MCPServerTool`](../type-aliases/MCPServerTool.md)\>

---

### isInitialized

> `protected` **isInitialized**: `boolean` = `false`

---

### isRunning

> `protected` **isRunning**: `boolean` = `false`

## Accessors

### id

#### Get Signature

> **get** **id**(): `string`

Server identification

##### Returns

`string`

---

### name

#### Get Signature

> **get** **name**(): `string`

##### Returns

`string`

---

### description

#### Get Signature

> **get** **description**(): `string`

##### Returns

`string`

---

### version

#### Get Signature

> **get** **version**(): `string`

##### Returns

`string`

---

### category

#### Get Signature

> **get** **category**(): [`MCPServerCategory`](../type-aliases/MCPServerCategory.md)

##### Returns

[`MCPServerCategory`](../type-aliases/MCPServerCategory.md)

---

### initialized

#### Get Signature

> **get** **initialized**(): `boolean`

Check if server is initialized

##### Returns

`boolean`

---

### running

#### Get Signature

> **get** **running**(): `boolean`

Check if server is running

##### Returns

`boolean`

## Methods

### init()

> **init**(): `Promise`\<`void`\>

Initialize the server
Override in subclasses for async initialization

#### Returns

`Promise`\<`void`\>

---

### onInit()

> `protected` **onInit**(): `Promise`\<`void`\>

Hook for subclass initialization
Override to perform async setup

#### Returns

`Promise`\<`void`\>

---

### start()

> **start**(): `Promise`\<`void`\>

Start the server

#### Returns

`Promise`\<`void`\>

---

### onStart()

> `protected` **onStart**(): `Promise`\<`void`\>

Hook for subclass start logic

#### Returns

`Promise`\<`void`\>

---

### stop()

> **stop**(`reason?`): `Promise`\<`void`\>

Stop the server

#### Parameters

##### reason?

`string`

#### Returns

`Promise`\<`void`\>

---

### onStop()

> `protected` **onStop**(): `Promise`\<`void`\>

Hook for subclass stop logic

#### Returns

`Promise`\<`void`\>

---

### registerTool()

> **registerTool**(`tool`): `this`

Register a tool with the server

#### Parameters

##### tool

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

#### Returns

`this`

---

### registerTools()

> **registerTools**(`tools`): `this`

Register multiple tools at once

#### Parameters

##### tools

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

#### Returns

`this`

---

### validateTool()

> `protected` **validateTool**(`tool`): `void`

Validate tool configuration

#### Parameters

##### tool

[`MCPServerTool`](../type-aliases/MCPServerTool.md)

#### Returns

`void`

---

### executeTool()

> **executeTool**(`toolName`, `params`, `context?`): `Promise`\<[`ToolResult`](../type-aliases/ToolResult.md)\>

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

Get all registered tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getTool()

> **getTool**(`name`): [`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

Get a specific tool by name

#### Parameters

##### name

`string`

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md) \| `undefined`

---

### hasTool()

> **hasTool**(`name`): `boolean`

Check if a tool exists

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### removeTool()

> **removeTool**(`name`): `boolean`

Remove a tool

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### toServerInfo()

> **toServerInfo**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

Get server info in MCPServerInfo format

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

---

### getToolsByAnnotation()

> **getToolsByAnnotation**(`annotation`, `value`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

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

Get read-only tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getDestructiveTools()

> **getDestructiveTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Get destructive tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getIdempotentTools()

> **getIdempotentTools**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Get idempotent tools

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

---

### getToolsRequiringConfirmation()

> **getToolsRequiringConfirmation**(): [`MCPServerTool`](../type-aliases/MCPServerTool.md)[]

Get tools that require confirmation

#### Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)[]
