[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskDefinition

# Type Alias: TaskDefinition

> **TaskDefinition** = `object`

Defined in: [types/task.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L96)

## Properties

### name

> **name**: `string`

Defined in: [types/task.ts:97](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L97)

---

### prompt

> **prompt**: `string`

Defined in: [types/task.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L98)

---

### schedule

> **schedule**: [`TaskSchedule`](TaskSchedule.md)

Defined in: [types/task.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L99)

---

### mode?

> `optional` **mode?**: [`TaskExecutionMode`](TaskExecutionMode.md)

Defined in: [types/task.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L100)

---

### type?

> `optional` **type?**: [`ScheduledTaskType`](ScheduledTaskType.md)

Defined in: [types/task.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L103)

Task type discriminator. Default: "standard"

---

### autoresearch?

> `optional` **autoresearch?**: [`AutoresearchTaskConfig`](AutoresearchTaskConfig.md)

Defined in: [types/task.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L105)

Autoresearch config (required when type === "autoresearch")

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/task.ts:108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L108)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/task.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L109)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/task.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L110)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/task.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L111)

---

### tools?

> `optional` **tools?**: `boolean`

Defined in: [types/task.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L113)

Enable/disable tools for this task. Default: true

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/task.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L114)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/task.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L115)

---

### maxRuns?

> `optional` **maxRuns?**: `number`

Defined in: [types/task.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L119)

Max number of executions. Omit for unlimited.

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/task.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L121)

Per-run timeout in ms. Default: 120000

---

### retry?

> `optional` **retry?**: `object`

Defined in: [types/task.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L124)

#### maxAttempts?

> `optional` **maxAttempts?**: `number`

Default: 3

#### backoffMs?

> `optional` **backoffMs?**: `number`[]

Default: [30000, 60000, 300000]

---

### onSuccess?

> `optional` **onSuccess?**: (`result`) => `void` \| `Promise`\<`void`\>

Defined in: [types/task.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L132)

#### Parameters

##### result

[`TaskRunResult`](TaskRunResult.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onError?

> `optional` **onError?**: (`error`) => `void` \| `Promise`\<`void`\>

Defined in: [types/task.ts:133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L133)

#### Parameters

##### error

[`TaskRunError`](TaskRunError.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onComplete?

> `optional` **onComplete?**: (`task`) => `void` \| `Promise`\<`void`\>

Defined in: [types/task.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L135)

Called when task reaches a terminal state (completed, failed, cancelled)

#### Parameters

##### task

[`Task`](Task.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/task.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L137)
