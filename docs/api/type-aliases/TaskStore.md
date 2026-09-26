[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskStore

# Type Alias: TaskStore

> **TaskStore** = `object`

Abstracts task persistence. Auto-selected based on backend:

- BullMQ → RedisTaskStore
- NodeTimeout → FileTaskStore

## Properties

### type

> `readonly` **type**: `"redis"` \| `"file"`

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

### save()

> **save**(`task`): `Promise`\<`void`\>

#### Parameters

##### task

[`Task`](Task.md)

#### Returns

`Promise`\<`void`\>

---

### get()

> **get**(`taskId`): `Promise`\<[`Task`](Task.md) \| `null`\>

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<[`Task`](Task.md) \| `null`\>

---

### list()

> **list**(`filter?`): `Promise`\<[`Task`](Task.md)[]\>

#### Parameters

##### filter?

###### status?

[`TaskStatus`](TaskStatus.md)

#### Returns

`Promise`\<[`Task`](Task.md)[]\>

---

### update()

> **update**(`taskId`, `updates`): `Promise`\<[`Task`](Task.md)\>

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

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>

---

### appendRun()

> **appendRun**(`taskId`, `run`): `Promise`\<`void`\>

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

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<[`ConversationEntry`](ConversationEntry.md)[]\>

---

### clearHistory()

> **clearHistory**(`taskId`): `Promise`\<`void`\>

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<`void`\>
