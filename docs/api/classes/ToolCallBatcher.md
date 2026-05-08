[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolCallBatcher

# Class: ToolCallBatcher

Defined in: [mcp/batching/requestBatcher.ts:486](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L486)

Tool Call Batcher - Specialized batcher for MCP tool calls

## Constructors

### Constructor

> **new ToolCallBatcher**(`config?`): `ToolCallBatcher`

Defined in: [mcp/batching/requestBatcher.ts:494](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L494)

#### Parameters

##### config?

`Partial`\<[`BatchConfig`](../type-aliases/BatchConfig.md)\>

#### Returns

`ToolCallBatcher`

## Accessors

### queueSize

#### Get Signature

> **get** **queueSize**(): `number`

Defined in: [mcp/batching/requestBatcher.ts:574](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L574)

Get current queue size

##### Returns

`number`

---

### isIdle

#### Get Signature

> **get** **isIdle**(): `boolean`

Defined in: [mcp/batching/requestBatcher.ts:581](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L581)

Check if idle

##### Returns

`boolean`

## Methods

### setToolExecutor()

> **setToolExecutor**(`executor`): `void`

Defined in: [mcp/batching/requestBatcher.ts:536](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L536)

Set the tool executor function

#### Parameters

##### executor

(`tool`, `args`, `serverId?`) => `Promise`\<`unknown`\>

#### Returns

`void`

---

### execute()

> **execute**(`tool`, `args`, `serverId?`): `Promise`\<`unknown`\>

Defined in: [mcp/batching/requestBatcher.ts:549](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L549)

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

Defined in: [mcp/batching/requestBatcher.ts:560](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L560)

Flush pending tool calls

#### Returns

`Promise`\<`void`\>

---

### drain()

> **drain**(): `Promise`\<`void`\>

Defined in: [mcp/batching/requestBatcher.ts:567](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L567)

Wait for all pending tool calls to complete

#### Returns

`Promise`\<`void`\>

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/batching/requestBatcher.ts:588](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L588)

Destroy the batcher

#### Returns

`void`
