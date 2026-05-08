[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskStore

# Type Alias: TaskStore

> **TaskStore** = `object`

Defined in: [types/task.ts:226](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L226)

Abstracts task persistence. Auto-selected based on backend:

- BullMQ → RedisTaskStore
- NodeTimeout → FileTaskStore

## Properties

### type

> `readonly` **type**: `"redis"` \| `"file"`

Defined in: [types/task.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L227)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [types/task.ts:229](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L229)

#### Returns

`Promise`\<`void`\>

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [types/task.ts:230](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L230)

#### Returns

`Promise`\<`void`\>

---

### save()

> **save**(`task`): `Promise`\<`void`\>

Defined in: [types/task.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L233)

#### Parameters

##### task

[`Task`](Task.md)

#### Returns

`Promise`\<`void`\>

---

### get()

> **get**(`taskId`): `Promise`\<[`Task`](Task.md) \| `null`\>

Defined in: [types/task.ts:234](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L234)

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<[`Task`](Task.md) \| `null`\>

---

### list()

> **list**(`filter?`): `Promise`\<[`Task`](Task.md)[]\>

Defined in: [types/task.ts:235](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L235)

#### Parameters

##### filter?

###### status?

[`TaskStatus`](TaskStatus.md)

#### Returns

`Promise`\<[`Task`](Task.md)[]\>

---

### update()

> **update**(`taskId`, `updates`): `Promise`\<[`Task`](Task.md)\>

Defined in: [types/task.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L236)

#### Parameters

##### taskId

`string`

##### updates

`Partial`\<[`Task`](Task.md)\>

#### Returns

`Promise`\<[`Task`](Task.md)\>

---

### delete()

> **delete**(`taskId`): `Promise`\<`void`\>

Defined in: [types/task.ts:237](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L237)

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>

---

### appendRun()

> **appendRun**(`taskId`, `run`): `Promise`\<`void`\>

Defined in: [types/task.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L240)

#### Parameters

##### taskId

`string`

##### run

[`TaskRunResult`](TaskRunResult.md)

#### Returns

`Promise`\<`void`\>

---

### getRuns()

> **getRuns**(`taskId`, `options?`): `Promise`\<[`TaskRunResult`](TaskRunResult.md)[]\>

Defined in: [types/task.ts:241](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L241)

#### Parameters

##### taskId

`string`

##### options?

###### limit?

`number`

###### status?

`string`

#### Returns

`Promise`\<[`TaskRunResult`](TaskRunResult.md)[]\>

---

### appendHistory()

> **appendHistory**(`taskId`, `messages`): `Promise`\<`void`\>

Defined in: [types/task.ts:247](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L247)

#### Parameters

##### taskId

`string`

##### messages

[`ConversationEntry`](ConversationEntry.md)[]

#### Returns

`Promise`\<`void`\>

---

### getHistory()

> **getHistory**(`taskId`): `Promise`\<[`ConversationEntry`](ConversationEntry.md)[]\>

Defined in: [types/task.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L248)

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<[`ConversationEntry`](ConversationEntry.md)[]\>

---

### clearHistory()

> **clearHistory**(`taskId`): `Promise`\<`void`\>

Defined in: [types/task.ts:249](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L249)

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>
