[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestBatcher

# Class: RequestBatcher\<T\>

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

Get current queue size

##### Returns

`number`

---

### activeBatchCount

#### Get Signature

> **get** **activeBatchCount**(): `number`

Get number of active batches

##### Returns

`number`

---

### isIdle

#### Get Signature

> **get** **isIdle**(): `boolean`

Check if the batcher is idle (no pending requests)

##### Returns

`boolean`

## Methods

### setExecutor()

> **setExecutor**(`executor`): `void`

Set the batch executor function

#### Parameters

##### executor

[`BatchExecutor`](../type-aliases/BatchExecutor.md)\<`T`\>

#### Returns

`void`

---

### add()

> **add**(`tool`, `args`, `serverId?`): `Promise`\<`T`\>

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

Manually flush the current batch

#### Returns

`Promise`\<`void`\>

---

### drain()

> **drain**(): `Promise`\<`void`\>

Wait for all pending requests to complete

#### Returns

`Promise`\<`void`\>

---

### destroy()

> **destroy**(): `void`

Destroy the batcher and reject all pending requests

#### Returns

`void`
