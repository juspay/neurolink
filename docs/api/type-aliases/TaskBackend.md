[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskBackend

# Type Alias: TaskBackend

> **TaskBackend** = `object`

Abstracts the scheduling/looping mechanism.
Implementations: BullMQ (production), NodeTimeout (development).

## Properties

### name

> `readonly` **name**: `string`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### schedule()

> **schedule**(`task`, `executor`): `Promise`\<`void`\>

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

Cancel a scheduled task

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>

---

### pause()

> **pause**(`taskId`): `Promise`\<`void`\>

Pause a task's schedule

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>

---

### resume()

> **resume**(`taskId`): `Promise`\<`void`\>

Resume a paused task

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Check if backend is operational

#### Returns

`Promise`\<`boolean`\>
