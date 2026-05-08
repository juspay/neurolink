[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskBackend

# Type Alias: TaskBackend

> **TaskBackend** = `object`

Defined in: [types/task.ts:268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L268)

Abstracts the scheduling/looping mechanism.
Implementations: BullMQ (production), NodeTimeout (development).

## Properties

### name

> `readonly` **name**: `string`

Defined in: [types/task.ts:269](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L269)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [types/task.ts:271](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L271)

#### Returns

`Promise`\<`void`\>

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [types/task.ts:272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L272)

#### Returns

`Promise`\<`void`\>

---

### schedule()

> **schedule**(`task`, `executor`): `Promise`\<`void`\>

Defined in: [types/task.ts:275](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L275)

Schedule a task for execution

#### Parameters

##### task

[`Task`](Task.md)

##### executor

[`TaskExecutorFn`](TaskExecutorFn.md)

#### Returns

`Promise`\<`void`\>

---

### cancel()

> **cancel**(`taskId`): `Promise`\<`void`\>

Defined in: [types/task.ts:277](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L277)

Cancel a scheduled task

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>

---

### pause()

> **pause**(`taskId`): `Promise`\<`void`\>

Defined in: [types/task.ts:279](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L279)

Pause a task's schedule

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>

---

### resume()

> **resume**(`taskId`): `Promise`\<`void`\>

Defined in: [types/task.ts:281](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L281)

Resume a paused task

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Defined in: [types/task.ts:284](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L284)

Check if backend is operational

#### Returns

`Promise`\<`boolean`\>
