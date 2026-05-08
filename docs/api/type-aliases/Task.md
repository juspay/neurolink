[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Task

# Type Alias: Task

> **Task** = `object`

Defined in: [types/task.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L142)

## Properties

### id

> **id**: `string`

Defined in: [types/task.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L143)

---

### name

> **name**: `string`

Defined in: [types/task.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L144)

---

### prompt

> **prompt**: `string`

Defined in: [types/task.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L145)

---

### schedule

> **schedule**: [`TaskSchedule`](TaskSchedule.md)

Defined in: [types/task.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L146)

---

### mode

> **mode**: [`TaskExecutionMode`](TaskExecutionMode.md)

Defined in: [types/task.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L147)

---

### type

> **type**: [`ScheduledTaskType`](ScheduledTaskType.md)

Defined in: [types/task.ts:149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L149)

Task type discriminator. Default: "standard"

---

### status

> **status**: [`TaskStatus`](TaskStatus.md)

Defined in: [types/task.ts:150](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L150)

---

### autoresearch?

> `optional` **autoresearch?**: [`AutoresearchTaskConfig`](AutoresearchTaskConfig.md)

Defined in: [types/task.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L153)

Autoresearch config (present when type === "autoresearch")

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/task.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L156)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/task.ts:157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L157)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/task.ts:158](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L158)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/task.ts:159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L159)

---

### tools

> **tools**: `boolean`

Defined in: [types/task.ts:160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L160)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/task.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L161)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/task.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L162)

---

### maxRuns?

> `optional` **maxRuns?**: `number`

Defined in: [types/task.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L165)

---

### timeout

> **timeout**: `number`

Defined in: [types/task.ts:166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L166)

---

### retry

> **retry**: `object`

Defined in: [types/task.ts:167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L167)

#### maxAttempts

> **maxAttempts**: `number`

#### backoffMs

> **backoffMs**: `number`[]

---

### runCount

> **runCount**: `number`

Defined in: [types/task.ts:170](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L170)

---

### lastRunAt?

> `optional` **lastRunAt?**: `string`

Defined in: [types/task.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L171)

---

### nextRunAt?

> `optional` **nextRunAt?**: `string`

Defined in: [types/task.ts:172](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L172)

---

### createdAt

> **createdAt**: `string`

Defined in: [types/task.ts:173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L173)

---

### updatedAt

> **updatedAt**: `string`

Defined in: [types/task.ts:174](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L174)

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/task.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L177)

Conversation session ID for continuation mode

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/task.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L179)
