[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestBatcher

# Class: RequestBatcher\<T\>

Defined in: [mcp/batching/requestBatcher.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L44)

Request Batcher - Efficient batch processing for MCP tool calls

## Example

```typescript
const batcher = new RequestBatcher<ToolResult>({
  maxBatchSize: 10,
  maxWaitMs: 100,
});

// Set the batch executor
batcher.setExecutor(async (requests) => {
  // Execute all requests in a batch
  return await Promise.all(requests.map((r) => executeTool(r.tool, r.args)));
});

// Add requests - they'll be batched automatically
const result1 = await batcher.add("getUserById", { id: 1 });
const result2 = await batcher.add("getUserById", { id: 2 });
```

## Extends

- `EventEmitter`

## Type Parameters

### T

`T` = `unknown`

## Constructors

### Constructor

> **new RequestBatcher**\<`T`\>(`config`): `RequestBatcher`\<`T`\>

Defined in: [mcp/batching/requestBatcher.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L55)

#### Parameters

##### config

[`BatchConfig`](../type-aliases/BatchConfig.md)

#### Returns

`RequestBatcher`\<`T`\>

#### Overrides

`EventEmitter.constructor`

## Accessors

### queueSize

#### Get Signature

> **get** **queueSize**(): `number`

Defined in: [mcp/batching/requestBatcher.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L155)

Get current queue size

##### Returns

`number`

---

### activeBatchCount

#### Get Signature

> **get** **activeBatchCount**(): `number`

Defined in: [mcp/batching/requestBatcher.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L162)

Get number of active batches

##### Returns

`number`

---

### isIdle

#### Get Signature

> **get** **isIdle**(): `boolean`

Defined in: [mcp/batching/requestBatcher.ts:169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L169)

Check if the batcher is idle (no pending requests)

##### Returns

`boolean`

## Methods

### setExecutor()

> **setExecutor**(`executor`): `void`

Defined in: [mcp/batching/requestBatcher.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L70)

Set the batch executor function

#### Parameters

##### executor

[`BatchExecutor`](../type-aliases/BatchExecutor.md)\<`T`\>

#### Returns

`void`

---

### add()

> **add**(`tool`, `args`, `serverId?`): `Promise`\<`T`\>

Defined in: [mcp/batching/requestBatcher.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L77)

Add a request to the batch queue

#### Parameters

##### tool

`string`

##### args

`unknown`

##### serverId?

`string`

#### Returns

`Promise`\<`T`\>

---

### flush()

> **flush**(): `Promise`\<`void`\>

Defined in: [mcp/batching/requestBatcher.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L137)

Manually flush the current batch

#### Returns

`Promise`\<`void`\>

---

### drain()

> **drain**(): `Promise`\<`void`\>

Defined in: [mcp/batching/requestBatcher.ts:176](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L176)

Wait for all pending requests to complete

#### Returns

`Promise`\<`void`\>

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/batching/requestBatcher.ts:194](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/batching/requestBatcher.ts#L194)

Destroy the batcher and reject all pending requests

#### Returns

`void`
