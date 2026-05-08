[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskManagerConfig

# Type Alias: TaskManagerConfig

> **TaskManagerConfig** = `object`

Defined in: [types/task.ts:340](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L340)

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/task.ts:342](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L342)

Default: true

---

### backend?

> `optional` **backend?**: [`TaskBackendName`](TaskBackendName.md)

Defined in: [types/task.ts:344](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L344)

Default: "bullmq"

---

### redis?

> `optional` **redis?**: `object`

Defined in: [types/task.ts:347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L347)

#### host?

> `optional` **host?**: `string`

#### port?

> `optional` **port?**: `number`

#### password?

> `optional` **password?**: `string`

#### db?

> `optional` **db?**: `number`

#### url?

> `optional` **url?**: `string`

Alternative: full Redis URL

---

### storePath?

> `optional` **storePath?**: `string`

Defined in: [types/task.ts:358](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L358)

Default: ".neurolink/tasks/tasks.json"

---

### logsPath?

> `optional` **logsPath?**: `string`

Defined in: [types/task.ts:360](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L360)

Default: ".neurolink/tasks/runs/"

---

### maxTasks?

> `optional` **maxTasks?**: `number`

Defined in: [types/task.ts:364](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L364)

Maximum number of tasks that can exist at once. Default: 100

---

### maxConcurrentRuns?

> `optional` **maxConcurrentRuns?**: `number`

Defined in: [types/task.ts:366](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L366)

Default: 5

---

### maxRunLogs?

> `optional` **maxRunLogs?**: `number`

Defined in: [types/task.ts:368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L368)

Max run log entries per task. Default: 2000

---

### maxHistoryEntries?

> `optional` **maxHistoryEntries?**: `number`

Defined in: [types/task.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L370)

Max continuation history entries per task. Default: 200 (100 exchanges)

---

### taskRetention?

> `optional` **taskRetention?**: [`TaskRetentionConfig`](TaskRetentionConfig.md)

Defined in: [types/task.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L373)
