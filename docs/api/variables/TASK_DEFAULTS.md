[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TASK_DEFAULTS

# Variable: TASK_DEFAULTS

> `const` **TASK_DEFAULTS**: `object`

Defined in: [types/task.ts:381](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L381)

## Type Declaration

### enabled

> `readonly` **enabled**: `true` = `true`

### maxTasks

> `readonly` **maxTasks**: `100` = `100`

### backend

> `readonly` **backend**: [`TaskBackendName`](../type-aliases/TaskBackendName.md)

### mode

> `readonly` **mode**: [`TaskExecutionMode`](../type-aliases/TaskExecutionMode.md)

### timeout

> `readonly` **timeout**: `120000` = `120_000`

### maxConcurrentRuns

> `readonly` **maxConcurrentRuns**: `5` = `5`

### maxRunLogs

> `readonly` **maxRunLogs**: `2000` = `2000`

### maxHistoryEntries

> `readonly` **maxHistoryEntries**: `200` = `200`

### tools

> `readonly` **tools**: `true` = `true`

### retry

> `readonly` **retry**: `object`

#### retry.maxAttempts

> `readonly` **maxAttempts**: `3` = `3`

#### retry.backoffMs

> `readonly` **backoffMs**: readonly \[`30000`, `60000`, `300000`\]

### storePath

> `readonly` **storePath**: `".neurolink/tasks/tasks.json"` = `".neurolink/tasks/tasks.json"`

### logsPath

> `readonly` **logsPath**: `".neurolink/tasks/runs/"` = `".neurolink/tasks/runs/"`

### redis

> `readonly` **redis**: `object`

#### redis.host

> `readonly` **host**: `"localhost"` = `"localhost"`

#### redis.port

> `readonly` **port**: `6379` = `6379`

### retention

> `readonly` **retention**: `object`

#### retention.completedTTL

> `readonly` **completedTTL**: `number` = `THIRTY_DAYS_MS`

#### retention.failedTTL

> `readonly` **failedTTL**: `number` = `SEVEN_DAYS_MS`

#### retention.cancelledTTL

> `readonly` **cancelledTTL**: `number` = `SEVEN_DAYS_MS`

#### retention.runLogTTL

> `readonly` **runLogTTL**: `number` = `THIRTY_DAYS_MS`
