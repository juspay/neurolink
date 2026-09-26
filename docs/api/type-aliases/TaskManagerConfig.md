[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskManagerConfig

# Type Alias: TaskManagerConfig

> **TaskManagerConfig** = `object`

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Default: true

---

### backend?

> `optional` **backend?**: [`TaskBackendName`](TaskBackendName.md)

Default: "bullmq"

---

### redis?

> `optional` **redis?**: `object`

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

Default: ".neurolink/tasks/tasks.json"

---

### logsPath?

> `optional` **logsPath?**: `string`

Default: ".neurolink/tasks/runs/"

---

### maxTasks?

> `optional` **maxTasks?**: `number`

Maximum number of tasks that can exist at once. Default: 100

---

### maxConcurrentRuns?

> `optional` **maxConcurrentRuns?**: `number`

Default: 5

---

### maxRunLogs?

> `optional` **maxRunLogs?**: `number`

Max run log entries per task. Default: 2000

---

### maxHistoryEntries?

> `optional` **maxHistoryEntries?**: `number`

Max continuation history entries per task. Default: 200 (100 exchanges)

---

### taskRetention?

> `optional` **taskRetention?**: [`TaskRetentionConfig`](TaskRetentionConfig.md)
