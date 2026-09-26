[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolCallBatcher

# Class: ToolCallBatcher

Tool Call Batcher - Specialized batcher for MCP tool calls

## Constructors

### Constructor

> **new ToolCallBatcher**(`config?`): `ToolCallBatcher`

#### Parameters

##### config?

`Partial`\<[`BatchConfig`](../type-aliases/BatchConfig.md)\>

#### Returns

`ToolCallBatcher`

## Accessors

### queueSize

#### Get Signature

> **get** **queueSize**(): `number`

Get current queue size

##### Returns

`number`

---

### isIdle

#### Get Signature

> **get** **isIdle**(): `boolean`

Check if idle

##### Returns

`boolean`

## Methods

### setToolExecutor()

> **setToolExecutor**(`executor`): `void`

Set the tool executor function

#### Parameters

##### executor

(`tool`, `args`, `serverId?`) => `Promise`\<`unknown`\>

#### Returns

`void`

---

### execute()

> **execute**(`tool`, `args`, `serverId?`): `Promise`\<`unknown`\>

Execute a tool call (will be batched automatically)

#### Parameters

##### tool

`string`

##### args

`unknown`

##### serverId?

`string`

#### Returns

`Promise`\<`unknown`\>

---

### flush()

> **flush**(): `Promise`\<`void`\>

Flush pending tool calls

#### Returns

`Promise`\<`void`\>

---

### drain()

> **drain**(): `Promise`\<`void`\>

Wait for all pending tool calls to complete

#### Returns

`Promise`\<`void`\>

---

### destroy()

> **destroy**(): `void`

Destroy the batcher

#### Returns

`void`
