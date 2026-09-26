[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskDefinition

# Type Alias: TaskDefinition

> **TaskDefinition** = `object`

## Properties

### name

> **name**: `string`

---

### prompt

> **prompt**: `string`

---

### schedule

> **schedule**: [`TaskSchedule`](TaskSchedule.md)

---

### mode?

> `optional` **mode?**: [`TaskExecutionMode`](TaskExecutionMode.md)

---

### type?

> `optional` **type?**: [`ScheduledTaskType`](ScheduledTaskType.md)

Task type discriminator. Default: "standard"

---

### autoresearch?

> `optional` **autoresearch?**: [`AutoresearchTaskConfig`](AutoresearchTaskConfig.md)

Autoresearch config (required when type === "autoresearch")

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### tools?

> `optional` **tools?**: `boolean`

Enable/disable tools for this task. Default: true

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### temperature?

> `optional` **temperature?**: `number`

---

### maxRuns?

> `optional` **maxRuns?**: `number`

Max number of executions. Omit for unlimited.

---

### timeout?

> `optional` **timeout?**: `number`

Per-run timeout in ms. Default: 120000

---

### retry?

> `optional` **retry?**: `object`

#### maxAttempts?

> `optional` **maxAttempts?**: `number`

Default: 3

#### backoffMs?

> `optional` **backoffMs?**: `number`[]

Default: [30000, 60000, 300000]

---

### onSuccess?

> `optional` **onSuccess?**: (`result`) => `void` \| `Promise`\<`void`\>

#### Parameters

##### result

[`TaskRunResult`](TaskRunResult.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onError?

> `optional` **onError?**: (`error`) => `void` \| `Promise`\<`void`\>

#### Parameters

##### error

[`TaskRunError`](TaskRunError.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onComplete?

> `optional` **onComplete?**: (`task`) => `void` \| `Promise`\<`void`\>

Called when task reaches a terminal state (completed, failed, cancelled)

#### Parameters

##### task

[`Task`](Task.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>
