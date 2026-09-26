[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Task

# Type Alias: Task

> **Task** = `object`

## Properties

### id

> **id**: `string`

---

### name

> **name**: `string`

---

### prompt

> **prompt**: `string`

---

### schedule

> **schedule**: [`TaskSchedule`](TaskSchedule.md)

---

### mode

> **mode**: [`TaskExecutionMode`](TaskExecutionMode.md)

---

### type

> **type**: [`ScheduledTaskType`](ScheduledTaskType.md)

Task type discriminator. Default: "standard"

---

### status

> **status**: [`TaskStatus`](TaskStatus.md)

---

### autoresearch?

> `optional` **autoresearch?**: [`AutoresearchTaskConfig`](AutoresearchTaskConfig.md)

Autoresearch config (present when type === "autoresearch")

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

### tools

> **tools**: `boolean`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### temperature?

> `optional` **temperature?**: `number`

---

### maxRuns?

> `optional` **maxRuns?**: `number`

---

### timeout

> **timeout**: `number`

---

### retry

> **retry**: `object`

#### maxAttempts

> **maxAttempts**: `number`

#### backoffMs

> **backoffMs**: `number`[]

---

### runCount

> **runCount**: `number`

---

### lastRunAt?

> `optional` **lastRunAt?**: `string`

---

### nextRunAt?

> `optional` **nextRunAt?**: `string`

---

### createdAt

> **createdAt**: `string`

---

### updatedAt

> **updatedAt**: `string`

---

### sessionId?

> `optional` **sessionId?**: `string`

Conversation session ID for continuation mode

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>
