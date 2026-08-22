[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskManagerConfig

# Type Alias: TaskManagerConfig

> **TaskManagerConfig** = `object`

Defined in: [types/task.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L344)

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/task.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L346)

Default: true

---

### backend?

> `optional` **backend?**: [`TaskBackendName`](TaskBackendName.md)

Defined in: [types/task.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L348)

Default: "bullmq"

---

### redis?

> `optional` **redis?**: `object`

Defined in: [types/task.ts:351](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L351)

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

Defined in: [types/task.ts:362](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L362)

Default: ".neurolink/tasks/tasks.json"

---

### logsPath?

> `optional` **logsPath?**: `string`

Defined in: [types/task.ts:364](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L364)

Default: ".neurolink/tasks/runs/"

---

### maxTasks?

> `optional` **maxTasks?**: `number`

Defined in: [types/task.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L368)

Maximum number of tasks that can exist at once. Default: 100

---

### maxConcurrentRuns?

> `optional` **maxConcurrentRuns?**: `number`

Defined in: [types/task.ts:370](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L370)

Default: 5

---

### maxRunLogs?

> `optional` **maxRunLogs?**: `number`

Defined in: [types/task.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L372)

Max run log entries per task. Default: 2000

---

### maxHistoryEntries?

> `optional` **maxHistoryEntries?**: `number`

Defined in: [types/task.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L374)

Max continuation history entries per task. Default: 200 (100 exchanges)

---

### taskRetention?

> `optional` **taskRetention?**: [`TaskRetentionConfig`](TaskRetentionConfig.md)

Defined in: [types/task.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L377)
